const express = require('express');
const router = express.Router();
const authController = require('../controller/auth');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public routes
router.post('/user/login', authController.userLogin);
router.post('/login', authController.adminLogin);
router.post('/first-admin', authController.createFirstAdmin);

// Protected routes
router.use(protect);

// Admin only routes
router.post('/signup', authorize('admin'), authController.adminSignup);
router.get('/profile', (req, res) => {
    if (req.admin) {
        res.json({ success: true, admin: req.admin });
    } else {
        res.json({ success: true, user: req.user });
    }
});

// Logout route
router.post('/logout', (req, res) => {
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    });
    res.status(200).json({
        success: true,
        message: 'Logged out successfully'
    });
});

module.exports = router; 