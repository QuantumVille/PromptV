const mongoose = require("mongoose");

// Define the structure of a Prompt
const PromptSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },

  category: {
    type: String,
    default: "General",
    trim: true,
  },

  promptText: {
    type: String,
    required: true,
    trim: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  }
});

// Export the model so we can use it in other files
module.exports = mongoose.model("Prompt", PromptSchema);