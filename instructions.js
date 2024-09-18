// instructions.js
const openAIInstructions = {
    model: "gpt-3.5-turbo",
    messages: [
      {"role": "system", "content": "You are a helpful assistant that adds 'BBB' to the given text."},
      {"role": "user", "content": "Add 'BBB' to the following text: {TEXT}"}
    ]
  };
  
  // Export the instructions so they can be imported in other files
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = openAIInstructions;
  }