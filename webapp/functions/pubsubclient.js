// pubsubClient.js
const { PubSub } = require('@google-cloud/pubsub');

function createPubSubClient() {
  const options = {
    projectId: process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG).projectId : 'jobille-45494',
  };

  if (process.env.FUNCTIONS_EMULATOR) {
    console.log('Running in emulator environment');
    if (process.env.PUBSUB_EMULATOR_HOST) {
      console.log('Using PubSub emulator');
      options.apiEndpoint = process.env.PUBSUB_EMULATOR_HOST;
    } else {
      console.warn('PUBSUB_EMULATOR_HOST not set in emulator environment');
    }
  }

  return new PubSub(options);
}

module.exports = createPubSubClient();