const express = require("express");
const app = express();
const Joi = require("joi");
const multer = require("multer");
app.use(express.static("public"));
app.use("/images", express.static("public/images"));
app.use(express.json());
const cors = require("cors");
app.use(cors());
const mongoose = require("mongoose");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./public/images/");
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage: storage });

mongoose
  .connect(
    "mongodb+srv://Brionna:green3030@brionna.kk0ye.mongodb.net/recipehub?retryWrites=true&w=majority&appName=brionna"
  )
  .then(() => {
    console.log("connected to mongodb");
  })
  .catch((error) => {
    console.log("couldn't connect to mongodb", error);
  });

const recipeSchema = new mongoose.Schema({
  title: String,
  description: String,
  prep_time: Number,
  rating: Number,
  img_name: String,
});
const Recipe = mongoose.model("Recipe", recipeSchema);

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.get("/api/recipes", async (req, res) => {
  const recipes = await Recipe.find();
  res.send(recipes);
});

app.get("/api/recipes/:id", async (req, res) => {
  const recipe = await Recipe.findOne({ _id: req.params.id });
  res.send(recipe);
});

app.post("/api/recipes", upload.single("img"), async (req, res) => {
  const result = validateRecipe(req.body);
  if (result.error) {
    res.status(400).send(result.error.details[0].message);
    return;
  }
  const recipe = new Recipe({
    title: req.body.title,
    description: req.body.description,
    prep_time: req.body.prep_time,
    rating: req.body.rating,
  });
  if (req.file) {
    recipe.img_name = "images/" + req.file.filename;
  }
  const newRecipe = await recipe.save();
  res.send(newRecipe);
});

app.put("/api/recipes/:id", upload.single("img"), async (req, res) => {
  const result = validateRecipe(req.body);
  if (result.error) {
    res.status(400).send(result.error.details[0].message);
    return;
  }
  let fieldsToUpdate = {
    title: req.body.title,
    description: req.body.description,
    prep_time: req.body.prep_time,
    rating: req.body.rating,
  };
  if (req.file) {
    fieldsToUpdate.img_name = "images/" + req.file.filename;
  }
  const wentThrough = await Recipe.updateOne(
    { _id: req.params.id },
    fieldsToUpdate
  );
  const updatedRecipe = await Recipe.findOne({ _id: req.params.id });
  res.send(updatedRecipe);
});

app.delete("/api/recipes/:id", async (req, res) => {
  const recipe = await Recipe.findByIdAndDelete(req.params.id);
  res.send(recipe);
});

const validateRecipe = (recipe) => {
  const schema = Joi.object({
    _id: Joi.allow(""),
    title: Joi.string().min(1).required(),
    description: Joi.string().min(1).required(),
    prep_time: Joi.number().required(),
    rating: Joi.number().min(0).max(5).required(),
  });
  return schema.validate(recipe);
};

app.listen(3001, () => {
  console.log("I'm listening");
});









