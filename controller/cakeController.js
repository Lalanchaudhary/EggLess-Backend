const Cake = require('../models/Cake');
function generateSlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
// Get all cakes
const getAllCakes = async (req, res) => {
  try {
    const cakes = await Cake.find();
    res.status(200).json(cakes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllCakes2 = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const cursor = req.query.cursor;
    const query = cursor ? { createdAt: { $lt: new Date(cursor) } } : {};
    const cakes= await Cake.find(query)
    .sort({createdAt:-1})
    .limit(limit+1)

    const hasNextPage= cakes.length > limit;
    if(hasNextPage){
      cakes.pop();
    }
    console.log(cakes.length);
    res.status(200).json({
      data: cakes,
      nextCursor: hasNextPage? cakes[cakes.length -1].createdAt : null,
      message: "Cake Fetched Successfully!"
    })
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error!" })
  }
}

// Get single cake by ID
const getCakeById = async (req, res) => {
  try {
    const cake = await Cake.findById(req.params.id);
    if (!cake) {
      return res.status(404).json({ message: 'Cake not found' });
    }
    res.status(200).json(cake);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCakeBySlug = async (req, res) => {
  try {
    const cake = await Cake.findOne({ slug: req.params.slug });

    if (!cake) {
      return res.status(404).json({ message: "Cake not found" });
    }

    res.status(200).json(cake);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new cake
const createCake = async (req, res) => {
  try {
    const { name } = req.body;
console.log("REQ BODY:", req.body);
    // Basic validation
    if (!name) {
      return res.status(400).json({ message: "Cake name is required" });
    }

    // Generate slug
    let slug = generateSlug(name);

    // Check if slug already exists
    const existingCake = await Cake.findOne({ slug });
    if (existingCake) {
      slug = `${slug}-${Date.now()}`; // make slug unique
    }

    const cake = new Cake({
      ...req.body,
      slug,
    });

    const savedCake = await cake.save();

    res.status(201).json({
      success: true,
      message: "Cake created successfully",
      data: savedCake,
    });

  } catch (error) {
    console.error("Create Cake Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


const createMultipleCakes = async (req, res) => {
  try {
    const cakes = req.body; // Assuming the request body contains an array of cakes
    for (let cake of cakes) {
      const slug = generateSlug(cake.name);
      cake.slug=slug;
    }
    const savedCakes = await Cake.insertMany(cakes);
    res.status(201).json(savedCakes);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


// Update cake
const updateCake = async (req, res) => {
  try {
    const cake = await Cake.findById(req.params.id);
    if (!cake) {
      return res.status(404).json({ message: 'Cake not found' });
    }

    Object.assign(cake, req.body);
    const updatedCake = await cake.save();
    res.status(200).json(updatedCake);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete cake
const deleteCake = async (req, res) => {
  try {
    const cake = await Cake.findById(req.params.id);
    if (!cake) {
      return res.status(404).json({ message: 'Cake not found' });
    }

    await cake.deleteOne();
    res.status(200).json({ message: 'Cake deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add review to cake
const addReview = async (req, res) => {
  console.log('====================================');
  console.log("review", req.body);
  console.log('====================================');
  try {
    const cake = await Cake.findById(req.params.id);
    if (!cake) {
      return res.status(404).json({ message: 'Cake not found' });
    }

    const { name, rating, comment } = req.body;
    const review = {
      id: cake.reviewsList.length + 1,
      name,
      rating,
      comment,
      date: new Date()
    };

    cake.reviewsList.push(review);

    // Update average rating
    const totalRating = cake.reviewsList.reduce((sum, review) => sum + review.rating, 0);
    cake.rating = totalRating / cake.reviewsList.length;
    cake.reviewCount = cake.reviewsList.length;

    const updatedCake = await cake.save();
    res.status(200).json(updatedCake);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getCakeByFlavor=async (req,res)=>{
  const {flavor} =req.body;
  const limit = parseInt(req.body.query.limit) || 10;
  const cursor = query.cursor;
  const query= cursor?{ createdAt: { $lt: new Date(cursor) } } : {};
  try{
  const cakes= await Cake.find({flavor: flavor && query})
  .sort({createdAt:-1})
  .limit(limit + 1);

  const hasNextPage= cakes.length>limit;
  if(hasNextPage){
    cakes.pop();
  }

  res.status(200).json({
    cakes,
    nextCursor:hasNextPage? cakes[cakes.length -1].createdAt: null,
    message: "Cakes fetched successfully!"
  })
  }catch(error){
    res.status(500).json({message:"Internal Server Error!"});
  }
}

module.exports = {
  getAllCakes,
  getAllCakes2,
  getCakeById,
  getCakeBySlug,
  createCake,
  createMultipleCakes,
  updateCake,
  deleteCake,
  addReview
}; 