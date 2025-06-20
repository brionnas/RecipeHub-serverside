const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const Joi = require('joi');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use("/images", express.static(path.join(__dirname, "public/images")));

// MongoDB connection
mongoose.connect('mongodb+srv://Brionna:green3030@brionna.kk0ye.mongodb.net/?retryWrites=true&w=majority&appName=brionna')
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB connection failed:", err));

// Mongoose schema & model
const recipeSchema = new mongoose.Schema({
  title: String,
  description: String,
  prep_time: Number,
  rating: Number,
  img_name: String
});
const Recipe = mongoose.model('Recipe', recipeSchema);

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, './public/images'),
  filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage });

// Joi validation schema
const validateRecipe = (data) => {
  const schema = Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
    prep_time: Joi.number().min(1).required(),
    rating: Joi.number().min(0).max(5).required(),
    img_name: Joi.string().allow('', null)
  });
  return schema.validate(data);
};

// GET all recipes
app.get('/api/recipes', async (req, res) => {
  const recipes = await Recipe.find();
  res.send(recipes);
});

// POST new recipe
app.post('/api/recipes', upload.single("img"), async (req, res) => {
  const imgPath = req.file ? "images/" + req.file.filename : "";
  const { error } = validateRecipe({ ...req.body, img_name: imgPath });
  if (error) return res.status(400).send({ error: error.details[0].message });

  const newRecipe = new Recipe({
    title: req.body.title,
    description: req.body.description,
    prep_time: parseInt(req.body.prep_time),
    rating: parseFloat(req.body.rating),
    img_name: imgPath
  });

  const result = await newRecipe.save();
  res.send(result);
});

// PUT update existing recipe
app.put('/api/recipes/:id', upload.single("img"), async (req, res) => {
  const imgPath = req.file ? "images/" + req.file.filename : req.body.img_name;
  const { error } = validateRecipe({ ...req.body, img_name: imgPath });
  if (error) return res.status(400).send({ error: error.details[0].message });

  const updated = await Recipe.findByIdAndUpdate(
    req.params.id,
    {
      title: req.body.title,
      description: req.body.description,
      prep_time: parseInt(req.body.prep_time),
      rating: parseFloat(req.body.rating),
      img_name: imgPath
    },
    { new: true }
  );

  if (!updated) return res.status(404).send({ error: "Recipe not found" });
  res.send(updated);
});

// DELETE recipe
app.delete('/api/recipes/:id', async (req, res) => {
  const deleted = await Recipe.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).send({ error: "Recipe not found" });
  res.send(deleted);
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));









