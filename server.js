const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const Joi = require('joi');
const recipes = require('./recipe');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, 'recipe-' + uniqueSuffix + fileExtension);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed'), false);
    }
  }
});

// Serve static index page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Updated Joi schema (no longer requires img_name as string)
const recipeSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().required(),
  prep_time: Joi.number().min(1).required(),
  rating: Joi.number().min(0).max(5).required()
});

// GET all recipes
app.get('/api/recipes', (req, res) => {
  res.json(recipes);
});

// POST new recipe with image upload
app.post('/api/recipes', upload.single('image'), (req, res) => {
  try {
    // Check if image was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'Recipe image is required' });
    }

    // Validate other fields
    const { error } = recipeSchema.validate({
      title: req.body.title,
      description: req.body.description,
      prep_time: Number(req.body.prep_time),
      rating: Number(req.body.rating)
    });

    if (error) {
      // Delete uploaded file if validation fails
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: error.details[0].message });
    }

    const newRecipe = {
      _id: recipes.length + 1,
      title: req.body.title,
      description: req.body.description,
      prep_time: Number(req.body.prep_time),
      rating: Number(req.body.rating),
      img_name: req.file.filename // Store the generated filename
    };

    recipes.push(newRecipe);
    res.status(201).json({ success: true, recipe: newRecipe });
  } catch (err) {
    console.error('Upload error:', err);
    
    // Clean up uploaded file if it exists
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size too large. Maximum size is 5MB.' });
    }
    
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// PUT edit recipe (with optional image update)
app.put('/api/recipes/:id', upload.single('image'), (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const index = recipes.findIndex(r => r._id === id);
    
    if (index === -1) {
      // Clean up uploaded file if recipe not found
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ error: "Recipe not found" });
    }

    // Validate fields (image is optional for updates)
    const { error } = recipeSchema.validate({
      title: req.body.title,
      description: req.body.description,
      prep_time: Number(req.body.prep_time),
      rating: Number(req.body.rating)
    });

    if (error) {
      // Clean up uploaded file if validation fails
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: error.details[0].message });
    }

    const oldRecipe = recipes[index];
    const updatedRecipe = {
      _id: id,
      title: req.body.title,
      description: req.body.description,
      prep_time: Number(req.body.prep_time),
      rating: Number(req.body.rating),
      img_name: req.file ? req.file.filename : oldRecipe.img_name
    };

    // If new image uploaded, delete old image file
    if (req.file && oldRecipe.img_name && oldRecipe.img_name.startsWith('recipe-')) {
      const oldImagePath = path.join(uploadsDir, oldRecipe.img_name);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    recipes[index] = updatedRecipe;
    res.status(200).json(updatedRecipe);
  } catch (err) {
    console.error('Update error:', err);
    
    // Clean up uploaded file if it exists
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size too large. Maximum size is 5MB.' });
    }
    
    res.status(500).json({ error: 'Failed to update recipe' });
  }
});

// DELETE recipe
app.delete('/api/recipes/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = recipes.findIndex(r => r._id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: "Recipe not found" });
  }

  const recipe = recipes[index];
  
  // Delete associated image file if it exists and is user-uploaded
  if (recipe.img_name && recipe.img_name.startsWith('recipe-')) {
    const imagePath = path.join(uploadsDir, recipe.img_name);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  }

  recipes.splice(index, 1);
  res.status(200).json({ message: "Deleted successfully" });
});

// Error handling middleware for multer
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size too large. Maximum size is 5MB.' });
    }
  }
  
  if (error.message === 'Only JPEG, PNG, GIF, and WebP images are allowed') {
    return res.status(400).json({ error: error.message });
  }
  
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});







