const express = require('express');
const router = express.Router();
const adminController = require('../controller/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('delivery_boy'));

router.get('/orders', adminController.getDeliveryBoyOrders);
router.get('/orders/:orderId', adminController.getDeliveryBoyOrderById);
router.get('/profile', adminController.getDeliveryBoyProfile);
router.put('/orders/:orderId/status', adminController.updateDeliveryBoyOrderStatus);
router.post('/orders/:orderId/verify-cod', adminController.verifyCODPayment);

module.exports = router; 