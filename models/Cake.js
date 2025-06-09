const mongoose = require('mongoose');

const sizeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  serves: { type: String, required: true }
}, { _id: false });

const reviewSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  name: { type: String, required: true },
  rating: { type: Number, required: true },
  comment: { type: String, required: true },
  date: { type: Date, required: true }
}, { _id: false });

const nutritionSchema = new mongoose.Schema({
  calories: String,
  protein: String,
  carbs: String,
  fat: String
}, { _id: false });

const cakeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  image: { type: String, required: true },
  description: { type: String },
  label: { type: String },
  flavour: { type: String },
  sizes: [sizeSchema],
  ingredients: [String],
  allergens: [String],
  nutritionInfo: nutritionSchema,
  reviews: [reviewSchema]
}, { timestamps: true });

module.exports = mongoose.model('Cake', cakeSchema);
