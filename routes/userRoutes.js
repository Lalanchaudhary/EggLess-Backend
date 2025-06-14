const express = require('express');
const router = express.Router();
const userController = require('../controller/userController');
const auth = require('../middleware/auth');

// Auth routes
router.post('/check-phone', userController.checkPhoneNumber);
router.post('/register', userController.register);
router.post('/login', userController.login);
router.post('/login/phone', userController.loginWithPhone);

// Profile routes
router.get('/profile', auth, userController.getProfile);
router.patch('/profile', auth, userController.updateProfile);

// Address routes
router.post('/addresses', auth, userController.addAddress);
router.patch('/addresses/:addressId', auth, userController.updateAddress);
router.delete('/addresses/:addressId', auth, userController.deleteAddress);

// UPI routes
router.post('/upi', auth, userController.addUPI);
router.patch('/upi/:upiId', auth, userController.updateUPI);
router.delete('/upi/:upiId', auth, userController.deleteUPI);

// Wallet routes
router.post('/wallet/add-money', auth, userController.addMoney);
router.get('/wallet/transactions', auth, userController.getWalletTransactions);

// Settings routes
router.patch('/settings', auth, userController.updateSettings);

// Orders routes
router.get('/orders', auth, userController.getOrders);
router.get('/orders/:orderId/cancel', auth, userController.cancelOrder);



module.exports = router; 