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

const getInputData = async (inputs, docData, context) => {
  const inputData = {};
  
  for (const input of inputs) {
    const resolvedPath = input.path.replace(/{(\w+)}/g, (match, key) => context[key] || match);
    const value = resolvedPath.split('.')
      .reduce((obj, key) => (obj && obj[key] !== undefined ? obj[key] : null), docData);
      
    if (value === null) {
      logger.warn(`Input data not found for path: ${resolvedPath}`);
      continue;
    }
    
    inputData[input.placeholder] = value;
  }
  
  return inputData;
};

const validateConfig = (config) => {
  // Basic field validation
  const requiredFields = [
    'name', 'instructions', 'inputs', 'outputPath', 'outputTransform',
    'triggerTopic', 'fallbackValue', 'api', 'collections'
  ];
  
  const missingFields = requiredFields.filter(field => !config[field]);
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }

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

  return true;
};

const transformOutput = async (apiResult, config, docRef, docData, executionId) => {
  const { outputTransform, outputPath } = config;
  
  try {
    let parsedResult;

    // Sanitize and parse JSON for relevant types
    if (outputTransform.type === 'numbered' || outputTransform.type === 'fixed' || outputTransform.type === 'extend') {
      if (typeof apiResult.extractedText === 'string') {
        try {
          // Sanitize the JSON string by replacing problematic quotes
          const sanitizedText = apiResult.extractedText.replace(/(?<=:\s*)"([^"]*)"(?=\s*[,}])/g, (match, p1) => {
            // Replace internal double quotes with single quotes
            return `"${p1.replace(/"/g, "'")}"`;
          });
          
          try {
            parsedResult = JSON.parse(sanitizedText);
          } catch (parseError) {
            // If still failing, try more aggressive sanitization
            const aggressiveSanitized = sanitizedText
              .replace(/\\"/g, "'") // Replace escaped quotes with single quotes
              .replace(/(?<=[:\s])"([^"]+)"(?=[,}\s])/g, '"$1"'); // Fix quote pairs
            
            parsedResult = JSON.parse(aggressiveSanitized);
          }
        } catch (error) {
          logger.error(`[${executionId}] Error parsing API result:`, error);
          logger.error(`[${executionId}] Raw API result:`, apiResult.extractedText.substring(0, 500));
          throw error;
        }
      } else {
        parsedResult = apiResult.extractedText;
      }
    }

    switch (outputTransform.type) {
      case 'direct':
        return await operations.updateField(docRef, docData, outputPath, apiResult.extractedText);

      case 'numbered': {
        const transformedEntries = {};
        let index = 1;
        
        for (const [key, value] of Object.entries(parsedResult)) {
          const entryKey = outputTransform.pattern.replace('{n}', index);
          const transformedValue = mapFields(value, outputTransform.fields);
          transformedEntries[entryKey] = transformedValue;
          index++;
        }
        
        return await operations.updateField(docRef, docData, outputPath, transformedEntries);
      }

      case 'fixed': {
        const transformedData = {};
        for (const [key, schema] of Object.entries(outputTransform.fields)) {
          if (parsedResult[key]) {
            transformedData[key] = mapFields(parsedResult[key], schema);
          }
        }
        return await operations.updateField(docRef, docData, outputPath, transformedData);
      }

      case 'extend': {
        const existingData = docData[outputPath.split('.')[0]] || {};
        if (outputTransform.pattern) {
          Object.entries(parsedResult).forEach(([key, value]) => {
            const entryKey = outputTransform.pattern.replace('{n}', key);
            if (existingData[entryKey]) {
              existingData[entryKey] = mapFields(value, outputTransform.fields);
            }
          });
        } else {
          Object.entries(parsedResult).forEach(([key, value]) => {
            if (existingData[key] && outputTransform.fields[key]) {
              existingData[key] = mapFields(value, outputTransform.fields[key]);
            }
          });
        }
        return await operations.updateField(docRef, docData, outputPath, existingData);
      }

      default:
        throw new Error(`Unknown transform type: ${outputTransform.type}`);
    }
  } catch (error) {
    logger.error(`[${executionId}] Error in transform:`, error);
    logger.error(`[${executionId}] Transform config:`, outputTransform);
    throw error;
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
  // Validate config with enhanced validation
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
      // Get document
      const { docRef: ref, docData } = await operations.getDocument(googleId, docId, config.collections);
      docRef = ref;

      // Get all input data
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

      // Trigger next step
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