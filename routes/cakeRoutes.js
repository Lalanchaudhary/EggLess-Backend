const express = require('express');
const router = express.Router();
const { 
  getAllCakes, 
  getAllCakes2,
  getCakeById, 
  getCakeBySlug,
  createCake, 
  createMultipleCakes,
  updateCake, 
  deleteCake,
  addReview,
  upload
} = require('../controller/cakeController');
const { protect } = require('../middleware/authMiddleware');
const auth =require("../middleware/auth")
// Public routes
router.get('/', getAllCakes);
router.get('/allcakes',getAllCakes2);
router.get('/:id', getCakeById);
router.get('/slug/:slug', getCakeBySlug);

// Protected routes (require authentication)
router.post('/:id/reviews', auth, addReview);

// Admin only routes
router.post('/',upload.single("image"), createCake);
router.post('/many', createMultipleCakes);
router.put('/:id', protect, upload.single("image"), updateCake);
router.delete('/:id', protect, deleteCake);

module.exports = router; 