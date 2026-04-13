const express = require("express");
const router = express.Router();
const Prompt = require("../models/prompt");


// CREATE a new prompt (POST)
router.post("/", async (req, res) => {
  try {
    const { title, category, promptText } = req.body;

    // Basic validation
    if (!title || !promptText) {
      return res.status(400).json({ message: "Title and prompt text are required" });
    }

    const newPrompt = new Prompt({
      title,
      category,
      promptText
    });

    const savedPrompt = await newPrompt.save();

    res.status(201).json(savedPrompt);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// GET all prompts (READ)
router.get("/", async (req, res) => {
  try {
    const prompts = await Prompt.find().sort({ createdAt: -1 });
    res.json(prompts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// UPDATE a prompt (PUT)
router.put("/:id", async (req, res) => {
  try {
    const { title, category, promptText } = req.body;

    const updatedPrompt = await Prompt.findByIdAndUpdate(
      req.params.id,
      { title, category, promptText },
      { new: true }
    );

    if (!updatedPrompt) {
      return res.status(404).json({ message: "Prompt not found" });
    }

    res.json(updatedPrompt);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// DELETE a prompt (DELETE)
router.delete("/:id", async (req, res) => {
  try {
    const deletedPrompt = await Prompt.findByIdAndDelete(req.params.id);

    if (!deletedPrompt) {
      return res.status(404).json({ message: "Prompt not found" });
    }

    res.json({ message: "Prompt deleted successfully" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


module.exports = router;