const express = require('express');
const router = express.Router();
const { paymentOrder, VerifyOrder, handleCODPayment, confirmCODPayment,payWithWallet, refundToWallet,getWalletTransactions ,addMoneyToWallet , verifyWalletTopUp} = require('../controller/paymentController');
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
router.post('/wallet/add', auth, addMoneyToWallet);
router.post('/wallet/verify', auth, verifyWalletTopUp);
module.exports = router;