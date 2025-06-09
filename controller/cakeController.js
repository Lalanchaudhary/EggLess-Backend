const Cake = require('../models/Cake');

// Get all cakes
const getAllCakes = async (req, res) => {
    console.log('====================================');
    console.log("cake");
    console.log('====================================');
  try {
    const cakes = await Cake.find();
    res.status(200).json(cakes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

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

// Create new cake
const createCake = async (req, res) => {
  try {
    const cake = new Cake(req.body);
    const savedCake = await cake.save();
    res.status(201).json(savedCake);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const createMultipleCakes = async (req, res) => {
    try {
      const cakes = req.body; // Assuming the request body contains an array of cakes
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
    console.log("review" , req.params.id);
    console.log('====================================');
  try {
    const cake = await Cake.findById(req.params.id);
    if (!cake) {
      return res.status(404).json({ message: 'Cake not found' });
    }

    const { name, rating, comment } = req.body;
    const review = {
      id: cake.reviews.length + 1,
      name,
      rating,
      comment,
      date: new Date()
    };

    cake.reviews.push(review);
    
    // Update average rating
    const totalRating = cake.reviews.reduce((sum, review) => sum + review.rating, 0);
    cake.rating = totalRating / cake.reviews.length;
    cake.reviewCount = cake.reviews.length;

    const updatedCake = await cake.save();
    res.status(200).json(updatedCake);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getAllCakes,
  getCakeById,
  createCake,
  createMultipleCakes,
  updateCake,
  deleteCake,
  addReview
}; 