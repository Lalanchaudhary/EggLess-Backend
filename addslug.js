// scripts/addSlugs.js

const mongoose = require("mongoose");
const Cake = require("./models/Cake"); // adjust path if needed

// 🔹 MongoDB Connection
mongoose
  .connect("mongodb+srv://EgglessCake:XCyTBu37MfwkYUWH@cluster0.bkwq5rr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => {
    console.error("❌ DB Connection Error:", err);
    process.exit(1);
  });

// 🔹 Slug Generator
function generateSlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// 🔹 Main Function
async function addSlugs() {
  try {
const cakes = await Cake.find({ slug: { $exists: false } });

for (let cake of cakes) {
  const slug = generateSlug(cake.name);

  await Cake.updateOne(
    { _id: cake._id },
    { $set: { slug } }
  );

  console.log(`✔ Slug added: ${cake.name} → ${slug}`);
}


    console.log("🎉 All slugs added successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error adding slugs:", error);
    process.exit(1);
  }
}

addSlugs();
