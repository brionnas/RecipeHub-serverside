const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");

app.use(express.json());
app.use(cors());

mongoose
  .connect("mongodb+srv://Brionna:green3030@brionna.kk0ye.mongodb.net/recipehub?retryWrites=true&w=majority&appName=brionna")
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((error) => console.error("❌ MongoDB connection failed", error));

const recipeSchema = new mongoose.Schema({
  title: String,
  description: String,
  prep_time: Number,
  rating: Number,
  img_url: String // Now just a string URL
});

const Recipe = mongoose.model("Recipe", recipeSchema);

app.get("/", (req, res) => {
  res.send("RecipeHub API is live");
});

app.get("/api/recipes", async (req, res) => {
  const recipes = await Recipe.find();
  res.send(recipes);
});

app.get("/api/recipes/:id", async (req, res) => {
  const recipe = await Recipe.findById(req.params.id);
  res.send(recipe);
});

app.post("/api/recipes", async (req, res) => {
  const { title, description, prep_time, rating, img_url } = req.body;
  if (!title || !description || !prep_time || !rating || !img_url) {
    return res.status(400).send({ error: "All fields are required." });
  }
  const recipe = new Recipe({ title, description, prep_time, rating, img_url });
  const newRecipe = await recipe.save();
  res.send(newRecipe);
});

app.delete("/api/recipes/:id", async (req, res) => {
  const deleted = await Recipe.findByIdAndDelete(req.params.id);
  res.send(deleted);
});

app.put("/api/recipes/:id", async (req, res) => {
  const { title, description, prep_time, rating, img_url } = req.body;
  const updated = await Recipe.findByIdAndUpdate(
    req.params.id,
    { title, description, prep_time, rating, img_url },
    { new: true }
  );
  res.send(updated);
});

app.listen(3001, () => {
  console.log("🚀 Server running on http://localhost:3001");
});










