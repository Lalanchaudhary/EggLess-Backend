const express = require('express');
const router = express.Router();
const { 
  getAllCakes, 
  getCakeById, 
  createCake, 
  createMultipleCakes,
  updateCake, 
  deleteCake,
  addReview 
} = require('../controller/cakeController');
const { protect } = require('../middleware/authMiddleware');
const auth =require("../middleware/auth")
// Public routes
router.get('/', getAllCakes);
router.get('/:id', getCakeById);

// Protected routes (require authentication)
router.post('/:id/reviews', auth, addReview);

// Admin only routes
router.post('/', createCake);
router.post('/many', createMultipleCakes);
router.put('/:id', protect, updateCake);
router.delete('/:id', protect, deleteCake);

module.exports = router; 