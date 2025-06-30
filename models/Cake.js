const mongoose = require('mongoose');

// Sizes schema
const sizeSchema = new mongoose.Schema({
  size: { type: String, required: false },
  serves: { type: String, default: "N/A" },
  price: { type: Number, required: false }
}, { _id: false });

// Main Cake schema
const cakeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  flavor: { type: String },
  price: { type: Number, required: true },
  image: { type: String, required: true },
  rating: { type: Number, default: 0 },
  reviews: { type: Number, default: 0 }, // renamed from "reviewCount"
  description: { type: String },
  sizes: [sizeSchema],
  label: { type: String },
  tag: { type: String },

  // Optional fields (you can still use them later if needed)
  original_price: { type: Number },
  ingredients: [String],
  allergens: [String],
  nutritionInfo: {
    calories: String,
    protein: String,
    carbs: String,
    fat: String
  },
  reviewsList: [ // renamed from `reviews` to avoid confusion
    {
      id: Number,
      name: String,
      rating: Number,
      comment: String,
      date: Date
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Cake', cakeSchema);
