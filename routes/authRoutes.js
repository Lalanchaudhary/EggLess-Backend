const express = require('express');
const router = express.Router();
const authController = require('../controller/auth');
const { protect, authorize ,verifyToken} = require('../middleware/authMiddleware');

// Test route to check if auth routes are working
router.get('/test', (req, res) => {
    res.json({ message: 'Auth routes are working!' });
});

// Public routes
router.post('/login', authController.adminLogin);
router.post('/first-admin', authController.createFirstAdmin);
router.get('/verify',verifyToken, authController.verifyAdmin);
// Protected routes
// router.use(protect); // protect middleware is causing issues with admin-signup
// Admin only routes
router.post('/admin-signup', authController.adminSignup);
router.get('/profile', protect, (req, res) => {
    if (req.admin) {
        res.json({ success: true, admin: req.admin });
    } else {
        res.json({ success: true, user: req.user });
    }
});

// Logout route
router.post('/logout', (req, res) => {
    const cookieOptions = {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
    };
    
    res.cookie('token', 'none', cookieOptions);
    res.status(200).json({
        success: true,
        message: 'Logged out successfully'
    });
});

module.exports = router; 