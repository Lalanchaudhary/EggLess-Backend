const mongoose = require("mongoose");
const Cake = require("./models/Cake"); // ⭐ SAME MODEL USE

mongoose.connect("mongodb+srv://EgglessCake:XCyTBu37MfwkYUWH@cluster0.bkwq5rr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");

function createSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, "-");
}

async function run() {
  const cakes = await Cake.find();
  console.log("Total cakes:", cakes.length);

  for (const cake of cakes) {
    if (!cake.slug) {
      let baseSlug = createSlug(cake.name);
      let slug = baseSlug;
      let count = 1;

      // ⭐ duplicate slug handle
      while (await Cake.findOne({ slug })) {
        slug = `${baseSlug}-${count++}`;
      }

      cake.slug = slug;
      await cake.save();

      console.log("Slug added:", slug);
    }
  }

  console.log("🎉 All existing cakes updated with slug");
  process.exit();
}

run();
