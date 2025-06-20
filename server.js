const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const Joi = require('joi');
const path = require('path');
const fs = require('fs');

const app = express();

// CORS configuration - allowing all origins for simplicity
app.use(cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static("public"));
app.use("/images", express.static(path.join(__dirname, "public/images")));

// Ensure images directory exists
const imagesDir = path.join(__dirname, 'public/images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
  console.log('📁 Created images directory');
}

// MongoDB connection with better error handling
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb+srv://Brionna:green3030@brionna.kk0ye.mongodb.net/recipehub?retryWrites=true&w=majority&appName=brionna', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  }
};

connectDB();

// Handle MongoDB connection events
mongoose.connection.on('disconnected', () => {
  console.log('❌ MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

// Enhanced Mongoose schema
const recipeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  prep_time: {
    type: Number,
    required: true,
    min: 1,
    max: 1440 // max 24 hours
  },
  rating: {
    type: Number,
    required: true,
    min: 0,
    max: 5
  },
  img_name: {
    type: String,
    default: ''
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

const Recipe = mongoose.model('Recipe', recipeSchema);

// Enhanced Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './public/images');
  },
  filename: (req, file, cb) => {
    // Create unique filename to avoid conflicts
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  // Check file type
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Enhanced Joi validation
const validateRecipe = (data) => {
  const schema = Joi.object({
    title: Joi.string().trim().min(1).max(200).required(),
    description: Joi.string().trim().min(1).max(1000).required(),
    prep_time: Joi.number().integer().min(1).max(1440).required(),
    rating: Joi.number().min(0).max(5).required(),
    img_name: Joi.string().allow('', null)
  });
  return schema.validate(data);
};

// Error handling middleware
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// GET all recipes with error handling
app.get('/api/recipes', asyncHandler(async (req, res) => {
  try {
    const recipes = await Recipe.find().sort({ createdAt: -1 }); // Sort by newest first
    res.json(recipes);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
}));

// POST new recipe with enhanced error handling
app.post('/api/recipes', upload.single("img"), asyncHandler(async (req, res) => {
  try {
    const imgPath = req.file ? "images/" + req.file.filename : "";
    
    const { error } = validateRecipe({ 
      ...req.body, 
      prep_time: parseInt(req.body.prep_time),
      rating: parseFloat(req.body.rating),
      img_name: imgPath 
    });
    
    if (error) {
      // Clean up uploaded file if validation fails
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      }
      return res.status(400).json({ error: error.details[0].message });
    }

    const newRecipe = new Recipe({
      title: req.body.title.trim(),
      description: req.body.description.trim(),
      prep_time: parseInt(req.body.prep_time),
      rating: parseFloat(req.body.rating),
      img_name: imgPath
    });

    const result = await newRecipe.save();
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating recipe:', error);
    // Clean up uploaded file on error
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }
    res.status(500).json({ error: 'Failed to create recipe' });
  }
}));

// PUT update existing recipe with enhanced error handling
app.put('/api/recipes/:id', upload.single("img"), asyncHandler(async (req, res) => {
  try {
    // Check if recipe exists
    const existingRecipe = await Recipe.findById(req.params.id);
    if (!existingRecipe) {
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      }
      return res.status(404).json({ error: "Recipe not found" });
    }

    const imgPath = req.file ? "images/" + req.file.filename : req.body.img_name || existingRecipe.img_name;
    
    const { error } = validateRecipe({ 
      ...req.body, 
      prep_time: parseInt(req.body.prep_time),
      rating: parseFloat(req.body.rating),
      img_name: imgPath 
    });
    
    if (error) {
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      }
      return res.status(400).json({ error: error.details[0].message });
    }

    // If new file uploaded, delete old file
    if (req.file && existingRecipe.img_name) {
      const oldFilePath = path.join(__dirname, 'public', existingRecipe.img_name);
      fs.unlink(oldFilePath, (err) => {
        if (err && err.code !== 'ENOENT') {
          console.error('Error deleting old file:', err);
        }
      });
    }

    const updated = await Recipe.findByIdAndUpdate(
      req.params.id,
      {
        title: req.body.title.trim(),
        description: req.body.description.trim(),
        prep_time: parseInt(req.body.prep_time),
        rating: parseFloat(req.body.rating),
        img_name: imgPath
      },
      { new: true, runValidators: true }
    );

    res.json(updated);
  } catch (error) {
    console.error('Error updating recipe:', error);
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }
    
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid recipe ID' });
    }
    res.status(500).json({ error: 'Failed to update recipe' });
  }
}));

// DELETE recipe with file cleanup
app.delete('/api/recipes/:id', asyncHandler(async (req, res) => {
  try {
    const deleted = await Recipe.findByIdAndDelete(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({ error: "Recipe not found" });
    }

    // Delete associated image file
    if (deleted.img_name) {
      const filePath = path.join(__dirname, 'public', deleted.img_name);
      fs.unlink(filePath, (err) => {
        if (err && err.code !== 'ENOENT') {
          console.error('Error deleting file:', err);
        }
      });
    }

    res.json({ message: 'Recipe deleted successfully', recipe: deleted });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid recipe ID' });
    }
    res.status(500).json({ error: 'Failed to delete recipe' });
  }
}));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    }
    return res.status(400).json({ error: 'File upload error: ' + error.message });
  }
  
  if (error.message === 'Only image files are allowed!') {
    return res.status(400).json({ error: error.message });
  }
  
  res.status(500).json({ error: 'Internal server error' });
});

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📊 Health check available at http://localhost:${PORT}/api/health`);
});









