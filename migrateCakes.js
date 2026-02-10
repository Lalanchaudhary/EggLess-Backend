// ⭐ separate mongoose instance (IMPORTANT)
const mongoose = require("mongoose");
const { Schema } = mongoose;

mongoose.connect("mongodb+srv://EgglessCake:XCyTBu37MfwkYUWH@cluster0.bkwq5rr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");


// ===== OLD SCHEMA =====
const oldSizeSchema = new Schema({
  size: String,
  serves: String,
  price: Number
}, { _id:false });

const CakeOld = mongoose.model(
  "CakeOld",
  new Schema({
    name: String,
    slug: String,
    category: String,
    flavor: String,
    price: Number,
    image: String,
    rating: Number,
    reviews: Number,
    description: String,
    sizes: [oldSizeSchema],
    label: String,
    tag: String,
    ingredients: [String],
    allergens: [String],
    nutritionInfo: Object,
    reviewsList: Array
  }, { timestamps:true }),
  "cakes" // read from OLD collection
);


// ===== NEW SCHEMA =====
const sizeSchema = new Schema({
  size: String,
  serves: String,
  price: Number
}, { _id:false });

const reviewSchema = new Schema({
  name: String,
  rating: Number,
  comment: String,
  date: Date
}, { _id:false });

const CakeNew = mongoose.model(
  "CakeNew",
  new Schema({
    name: String,
    slug: String,
    category: String,
    flavor: String,
    description: String,
    images: [String],
    sizes: [sizeSchema],
    badge: String,
    ingredients: [String],
    allergens: [String],
    nutritionInfo: Object,
    reviews: [reviewSchema],
    rating: Number,
    reviewCount: Number
  }, { timestamps:true }),
  "cakes_new" // write to NEW collection
);


// ===== MIGRATION =====
async function migrate() {
  const oldCakes = await CakeOld.find();
  console.log("Found cakes:", oldCakes.length);

  for (const oldCake of oldCakes) {
    const newCake = new CakeNew({
      name: oldCake.name,
      category: oldCake.category,
      flavor: oldCake.flavor,
      description: oldCake.description,
      ingredients: oldCake.ingredients,
      allergens: oldCake.allergens,
      nutritionInfo: oldCake.nutritionInfo,

      images: oldCake.image ? [oldCake.image] : [],

      sizes: oldCake.sizes?.length
        ? oldCake.sizes
        : [{ size: "1 Kg", serves: "6-8", price: oldCake.price || 0 }],

      badge: oldCake.label || oldCake.tag,
      reviews: oldCake.reviewsList || [],
      reviewCount: oldCake.reviewsList?.length || 0
    });

    await newCake.save();
    console.log("Migrated:", oldCake.name);
  }

  console.log("🎉 Migration finished");
  process.exit();
}

migrate();
