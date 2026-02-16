const mongoose = require('mongoose');


// ⭐ Review Schema (Production Level)
const reviewSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true
  },

  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },

  comment: {
    type: String,
    required: true,
    maxlength: 500
  },

  verifiedPurchase: {
    type: Boolean,
    default: false
  },

  images: [String], // customer cake photos

  ownerReply: {
    message: String,
    date: Date
  }

}, { timestamps: true });


// Sizes schema
const sizeSchema = new mongoose.Schema({
  size: String,
  serves: { type: String, default: "N/A" },
  price: Number
}, { _id: false });


// ⭐ Main Cake Schema
const cakeSchema = new mongoose.Schema({

  name: { type: String, required: true },
  slug: { type: String, unique: true },
  category: { type: String, required: true },
  flavor: String,
  image: { type: String, required: true },

  description: String,
  sizes: [sizeSchema],
  label: String,
  tag: String,
  ingredients: [String],
  allergens: [String],

  nutritionInfo: {
    calories: String,
    protein: String,
    carbs: String,
    fat: String
  },

  // ⭐ Reviews stored here
  reviews: [reviewSchema],

  // ⭐ Auto calculated fields
  averageRating: {
    type: Number,
    default: 0
  },

  totalReviews: {
    type: Number,
    default: 0
  }

}, { timestamps: true });

cakeSchema.index({ createdAt: -1 });


// ⭐ Automatically update rating before saving
cakeSchema.pre("save", function (next) {
  if (this.reviews.length > 0) {
    const total = this.reviews.reduce((acc, item) => acc + item.rating, 0);
    this.averageRating = (total / this.reviews.length).toFixed(1);
    this.totalReviews = this.reviews.length;
  } else {
    this.averageRating = 0;
    this.totalReviews = 0;
  }
  next();
});

module.exports = mongoose.models.Cake || mongoose.model("Cake", cakeSchema);
