const express = require("express");
const app = express();
const cors = require("cors");
const path = require("path");
const Joi = require("joi");
const mongoose = require("mongoose");

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// MongoDB connection
mongoose.connect("mongodb+srv://Brionna:green3030@brionna.kk0ye.mongodb.net/?retryWrites=true&w=majority&appName=brionna")
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// Schema for Recipe
const recipeSchema = new mongoose.Schema({
  title: String,
  description: String,
  prep_time: Number,
  rating: Number,
  img_name: String
});

const Recipe = mongoose.model("Recipe", recipeSchema);

// Joi validation
const recipeSchemaJoi = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().required(),
  prep_time: Joi.number().min(1).required(),
  rating: Joi.number().min(0).max(5).required(),
  img_name: Joi.string().required()
});

// Serve index page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// GET all recipes
app.get("/api/recipes", async (req, res) => {
  const recipes = await Recipe.find();
  res.send(recipes);
});

// POST a new recipe
app.post("/api/recipes", async (req, res) => {
  const { error } = recipeSchemaJoi.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const recipe = new Recipe(req.body);
  const saved = await recipe.save();
  res.status(201).json(saved);
});

// PUT update a recipe
app.put("/api/recipes/:id", async (req, res) => {
  const { error } = recipeSchemaJoi.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const updated = await Recipe.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!updated) return res.status(404).json({ error: "Recipe not found" });

  res.json(updated);
});

// DELETE a recipe
app.delete("/api/recipes/:id", async (req, res) => {
  const deleted = await Recipe.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ error: "Recipe not found" });

  res.json({ message: "Deleted successfully" });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));

















