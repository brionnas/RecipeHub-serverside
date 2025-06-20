const express = require('express');
const cors = require('cors');
const path = require('path');
const Joi = require('joi');
const recipes = require('./recipe');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Serve static index page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Joi schema
const recipeSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().required(),
  prep_time: Joi.number().min(1).required(),
  rating: Joi.number().min(0).max(5).required(),
  img_name: Joi.string().required()
});

// GET all recipes
app.get('/api/recipes', (req, res) => {
  res.json(recipes);
});

// POST new recipe
app.post('/api/recipes', (req, res) => {
  const { error } = recipeSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const newRecipe = {
    _id: recipes.length + 1,
    ...req.body
  };

  recipes.push(newRecipe);
  res.status(201).json({ success: true, recipe: newRecipe });
});

// PUT edit recipe
app.put('/api/recipes/:id', (req, res) => {
  const { error } = recipeSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const id = parseInt(req.params.id);
  const index = recipes.findIndex(r => r._id === id);
  if (index === -1) return res.status(404).json({ error: "Recipe not found" });

  const updatedRecipe = { _id: id, ...req.body };
  recipes[index] = updatedRecipe;
  res.status(200).json(updatedRecipe);
});

// DELETE recipe
app.delete('/api/recipes/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = recipes.findIndex(r => r._id === id);
  if (index === -1) return res.status(404).json({ error: "Recipe not found" });

  recipes.splice(index, 1);
  res.status(200).json({ message: "Deleted successfully" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});













