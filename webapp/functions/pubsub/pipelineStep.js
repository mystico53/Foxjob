// pipeline-step.js
const functions = require('firebase-functions/v2');
const { PubSub } = require('@google-cloud/pubsub');
const logger = require('firebase-functions/logger');
const { operations } = require('../services/operations');
const { callAnthropicAPI } = require('../services/anthropicService');
const { callOpenAIAPI } = require('../services/openaiService');

const pubSubClient = new PubSub();

// Helper function to safely stringify objects for logging
const safeStringify = (obj) => {
  try {
    return JSON.stringify(obj, (key, value) => {
      if (value instanceof Error) {
        return {
          message: value.message,
          stack: value.stack,
          ...value
        };
      }
      return value;
    }, 2);
  } catch (error) {
    return `[Unable to stringify: ${error.message}]`;
  }
};

const logApiOperation = (operation, details, executionId) => {
  const sanitizedDetails = { ...details };
  if (sanitizedDetails.apiKey) sanitizedDetails.apiKey = '[REDACTED]';
  if (sanitizedDetails.authorization) sanitizedDetails.authorization = '[REDACTED]';
  
  logger.info(`[${executionId}] API ${operation}:`, safeStringify(sanitizedDetails));
};

// Modified getInputData function to handle nested paths in multi-collection data
const getInputData = async (inputs, docData, context) => {
  const inputData = {};
  
  for (const input of inputs) {
    if (Array.isArray(input.path)) {
      // Handle array of paths
      const values = await Promise.all(input.path.map(async (pathStr) => {
        const value = pathStr.split('.')
          .reduce((obj, key) => (obj && obj[key] !== undefined ? obj[key] : null), docData);
          
        if (value === null) {
          logger.warn(`Input data not found for path: ${pathStr}`);
          return null;
        }
        return value;
      }));
      
      // Combine values with separator or default to space
      const combinedValue = values
        .filter(v => v !== null)
        .join(input.separator || ' ');
      
      inputData[input.placeholder] = combinedValue;
    } else {
      // Use rawText if we're looking for texts.extractedText and it doesn't exist
      if (input.path === 'texts.extractedText' && 
          (!docData.texts || !docData.texts.extractedText) && 
          docData.texts?.rawText) {
        inputData[input.placeholder] = docData.texts.rawText;
        continue;
      }

      const value = input.path.split('.')
        .reduce((obj, key) => (obj && obj[key] !== undefined ? obj[key] : null), docData);
        
      if (value === null) {
        logger.warn(`Input data not found for path: ${input.path}`);
        continue;
      }
      
      inputData[input.placeholder] = value;
    }
  }
  
  logger.debug('Processed input data:', {
    inputs: JSON.stringify(inputs),
    result: JSON.stringify(inputData)
  });
  
  return inputData;
};

const validateConfig = (config) => {
  // Basic field validation
  const requiredFields = [
    'name', 'instructions', 'inputs', 'outputPath', 'outputTransform',
    'triggerTopic', 'fallbackValue', 'api'
  ];
  
  // Add collection validation - either collections or collectionPath must exist
  if (!config.collections && !config.collectionPath) {
    throw new Error('Missing required field: either collections or collectionPath must be specified');
  }

  const missingFields = requiredFields.filter(field => !config[field]);
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }

  // Validate inputs format
  if (!Array.isArray(config.inputs)) {
    throw new Error('inputs must be an array');
  }

  config.inputs.forEach((input, index) => {
    if (!input.path || !input.placeholder) {
      throw new Error(`Input at index ${index} missing required fields: path and placeholder`);
    }
  });

  // Validate outputTransform based on type
  const { type } = config.outputTransform;
  
  switch (type) {
    case 'direct':
      // No additional validation needed
      break;

    case 'numbered':
      if (!config.outputTransform.fields?.name || !config.outputTransform.fields?.description) {
        throw new Error('Numbered transform requires fields.name and fields.description');
      }
      if (!config.outputTransform.pattern) {
        throw new Error('Numbered transform requires pattern');
      }
      break;

    case 'fixed':
      if (!config.outputTransform.fields) {
        throw new Error('Fixed transform requires fields configuration');
      }
      break;

    case 'extend':
      if (!config.outputTransform.fields) {
        throw new Error('Extend transform requires fields configuration');
      }
      if (!config.outputTransform.matchPattern) {
        throw new Error('Extend transform requires matchPattern');
      }
      break;

    default:
      throw new Error(`Unknown transform type: ${type}`);
  }

  // If using collectionPath, validate it's an array
  if (config.collectionPath && !Array.isArray(config.collectionPath)) {
    throw new Error('collectionPath must be an array');
  }

  return true;
};

const transformOutput = async (apiResult, config, docRef, docData, executionId) => {
  const { outputTransform, outputPath } = config;
  
  try {
    let parsedResult;

    // First check if we already have JSON
    if (typeof apiResult.extractedText === 'object') {
      parsedResult = apiResult.extractedText;
    } else {
      try {
        // Try to parse as JSON first
        parsedResult = JSON.parse(apiResult.extractedText);
      } catch (parseError) {
        // If JSON parsing fails, handle as plain text
        logger.info(`[${executionId}] Handling response as plain text`);
        
        // Handle plain text based on the output path
        if (outputPath === 'texts.extractedText') {
          // If we're updating extractedText, use the text directly
          return await operations.updateField(docRef, docData, outputPath, apiResult.extractedText);
        } else if (outputPath === 'jobdetails.jobsresponsibilities') {
          // If we're updating job responsibilities, create a structured object
          const responsibilities = apiResult.extractedText
            .split('\n')
            .filter(line => line.trim().length > 0)
            .map(line => line.trim());
            
          return await operations.updateField(docRef, docData, outputPath, {
            text: apiResult.extractedText,
            list: responsibilities
          });
        } else {
          // For other paths, create a basic structured object
          const structuredResult = {
            content: apiResult.extractedText,
            timestamp: new Date().toISOString(),
            source: config.name
          };

          return await operations.updateField(docRef, docData, outputPath, structuredResult);
        }
      }
    }

    // If we got here, we successfully parsed JSON, continue with existing transform logic
    let transformedResult;
    switch (outputTransform.type) {
      case 'direct':
        transformedResult = parsedResult;
        break;

      case 'numbered': {
        const transformedEntries = {};
        let index = 1;
        
        for (const [key, value] of Object.entries(parsedResult)) {
          const entryKey = outputTransform.pattern.replace('{n}', index);
          const transformedValue = mapFields(value, outputTransform.fields);
          transformedEntries[entryKey] = transformedValue;
          index++;
        }
        transformedResult = transformedEntries;
        break;
      }

      case 'fixed': {
        transformedResult = {};
        for (const [key, schema] of Object.entries(outputTransform.fields)) {
          if (parsedResult[key]) {
            transformedResult[key] = mapFields(parsedResult[key], schema);
          }
        }
        break;
      }

      default:
        throw new Error(`Unknown transform type: ${outputTransform.type}`);
    }

    // Update the document with transformed result
    return await operations.updateField(docRef, docData, outputPath, transformedResult);

  } catch (error) {
    logger.error(`[${executionId}] Error in transform:`, {
      error: error.message,
      stack: error.stack,
      apiResult: apiResult.extractedText?.substring(0, 200) // Log first 200 chars
    });

    // Create a safe fallback value that maintains structure
    const fallbackValue = {
      content: config.fallbackValue,
      error: error.message,
      timestamp: new Date().toISOString()
    };

    // Update with structured fallback value on error
    return await operations.updateField(docRef, docData, outputPath, fallbackValue);
  }
};

// Helper function to map fields according to schema
const mapFields = (value, schema) => {
  const result = {};
  Object.entries(schema).forEach(([resultField, targetField]) => {
    if (typeof targetField === 'object') {
      result[resultField] = mapFields(value[resultField] || {}, targetField);
    } else {
      result[targetField] = value[resultField];
    }
  });
  return result;
};

const callAPI = async (config, prompt, executionId) => {
  const apiStartTime = Date.now();
  
  try {
    let apiResult;
    if (config.api === 'anthropic') {
      apiResult = await callAnthropicAPI(prompt, config.instructions);
    } else if (config.api === 'openai') {
      apiResult = await callOpenAIAPI(prompt, config.instructions);
    } else {
      throw new Error(`Unsupported API: ${config.api}`);
    }

    logApiOperation('response', {
      duration: Date.now() - apiStartTime,
      status: 'success',
      resultLength: apiResult.extractedText?.length,
      resultPreview: apiResult.extractedText?.substring(0, 100) + '...',
    }, executionId);

    return apiResult;
  } catch (error) {
    logApiOperation('error', {
      duration: Date.now() - apiStartTime,
      error: error.message,
    }, executionId);
    throw error;
  }
};

const createPipelineStep = (config) => {
  validateConfig(config);

  return functions.pubsub.onMessagePublished(config.triggerTopic, async (event) => {
    const context = JSON.parse(Buffer.from(event.data.message.data, 'base64').toString());
    const { googleId, docId } = context;
    const executionId = `${config.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    logger.info(`[${executionId}] Starting pipeline step: ${config.name}`, {
      context: safeStringify(context)
    });

    let docRef;
    try {
      // Get document(s)
      const collectionInfo = config.collectionPath || config.collections;

      let result;
      if (Array.isArray(collectionInfo) && collectionInfo[0] && typeof collectionInfo[0] === 'object') {
        // collectionInfo is an array of objects with collectionPath and customDocId
        result = await operations.getDocuments(googleId, docId, collectionInfo);
      } else {
        // For backward compatibility, if collectionInfo is a string or array of strings
        result = await operations.getDocument(googleId, docId, collectionInfo);
      }

      const docRef = result.docRef;
      const docData = result.docData;

      // Get input data
      const inputData = await getInputData(config.inputs, docData, context);
      
      // Prepare prompt
      const prompt = Object.entries(inputData).reduce(
        (p, [placeholder, value]) => p.replace(placeholder, value),
        config.instructions
      );

      logApiOperation('request', {
        api: config.api,
        inputDataSummary: Object.keys(inputData).join(', '),
      }, executionId);

      // Call API
      const apiResult = await callAPI(config, prompt, executionId);

      // Transform and store result
      await transformOutput(apiResult, config, docRef, docData, executionId);

      // Trigger next step if configured
      if (config.nextTopic) {
        await operations.publishNext(pubSubClient, config.nextTopic, context);
        logger.info(`[${executionId}] Published to next topic: ${config.nextTopic}`);
      }

      logger.info(`[${executionId}] Pipeline step completed successfully`);

    } catch (error) {
      logger.error(`[${executionId}] Pipeline step failed:`, {
        error: safeStringify(error),
        stack: error.stack
      });
      
      if (docRef) {
        await operations.updateField(docRef, {}, config.outputPath, config.fallbackValue);
      }
    }
  });
};

module.exports = { createPipelineStep };