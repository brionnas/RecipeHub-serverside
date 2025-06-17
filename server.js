const express = require('express');
const cors = require('cors');
const path = require('path');
const recipes = require('./recipe');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Route to serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API route to get all recipes
app.get('/api/recipes', (req, res) => {
  res.json(recipes);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});




