const express = require('express');
const router = express.Router();
const { paymentOrder, VerifyOrder, handleCODPayment, confirmCODPayment,payWithWallet, refundToWallet,getWalletTransactions } = require('../controller/paymentController');
const { protect } = require('../middleware/authMiddleware');
const  auth  = require('../middleware/auth');
// Razorpay routes
router.post('/create-order', auth, paymentOrder);
router.post('/verify-order', auth, VerifyOrder);

// COD routes
router.post('/cod', protect, handleCODPayment);
router.put('/cod/:orderId/confirm', protect, confirmCODPayment);


// Wallet route
router.post('/payment/wallet', auth, payWithWallet);
router.post('/refund-to-wallet/:orderId', auth, refundToWallet);
router.get('/wallet/transactions', auth, getWalletTransactions);
module.exports = router;