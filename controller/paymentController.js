const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');
const User = require('../models/User');
const SocketService = require('../services/socketService');
const { findNearestAdmin } = require('../lib/utils');
require("dotenv").config();
console.log('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID);
console.log('RAZORPAY_KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET);
// Initialize Razorpay
const razorpay = new Razorpay({
  key_id:process.env.RAZORPAY_KEY_ID,
  key_secret:process.env.RAZORPAY_KEY_SECRET
});

// Create Razorpay order
const paymentOrder = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const {items, totalAmount, currency = 'INR', shippingAddress,orderInstruction, userId } = req.body;

    const totalAmountInt = parseInt(totalAmount);
    // Validate amount
    if (!totalAmountInt || totalAmountInt <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }
    

    const options = {
      amount: totalAmountInt * 100, // Razorpay expects amount in paise
      currency,
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    // Find nearest admin based on user location
    let assignedAdmin = null;
    if (shippingAddress && shippingAddress.location) {
      const nearestAdminResult = await findNearestAdmin(
        shippingAddress.location.latitude,
        shippingAddress.location.longitude
      );
      assignedAdmin = nearestAdminResult?.admin?._id || null;
    }

    // Create a pending order in our database
    const newOrder = new Order({
      user: req.user._id,
      totalAmount: totalAmountInt,
      paymentMethod: 'Razorpay',
      status: 'Pending',
      paymentStatus: 'Pending',
      razorpayOrderId: order.id,
      shippingAddress,
      orderInstructions:orderInstruction,
      items,
      assignedToAdmin: assignedAdmin
    });
    

    await newOrder.save();

    // Add order reference to user
    await User.findByIdAndUpdate(req.user._id, {
      $push: { orders: newOrder._id }
    });

    // Send notification to admin about new order
    const orderData = {
      orderId: newOrder.orderId,
      totalAmount: newOrder.totalAmount,
      paymentMethod: newOrder.paymentMethod,
      status: newOrder.status,
      customerName: req.user.name || req.user.email,
      items: newOrder.items,
      createdAt: newOrder.createdAt,
      assignedToAdmin: assignedAdmin
    };
    

    res.json({
      ...order,
      orderId: newOrder._id // Include our order ID in the response
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    if (error.error?.description) {
      return res.status(400).json({ message: error.error.description });
    }
    res.status(500).json({ message: 'Error creating payment order' });
  }
};

// Verify Razorpay payment
const VerifyOrder = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId
    } = req.body;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', 'c62L38n5PxbRhgbLkEJjmY9U')
      .update(body.toString())
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      // Update order payment status
      const order = await Order.findOne({ _id: orderId });

      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // Verify that the order belongs to the authenticated user
      if (order.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to access this order' });
      }

      await order.verifyPayment({
        paymentId: razorpay_payment_id,
        signature: razorpay_signature
      });

      // Send notification to admin about payment completion
      const orderData = {
        orderId: order.orderId,
        totalAmount: order.totalAmount,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        customerName: req.user.name || req.user.email,
        assignedToAdmin: order.assignedToAdmin
      };
      SocketService.notifyAdminNewOrder(orderData);
      // SocketService.notifyAdminPaymentCompleted(orderData);

      res.json({
        message: 'Payment verified successfully',
        order
      });
    } else {
      res.status(400).json({ message: 'Invalid payment signature' });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ message: 'Error verifying payment' });
  }
};

// Handle COD payment
const handleCODPayment = async (req, res) => {
  console.log('====================================');
  console.log("Cod pe",req.body);
  console.log('====================================');
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { items, shippingAddress, totalAmount ,orderInstruction } = req.body;

    // Validate required fields
    if (!items || !shippingAddress || !totalAmount) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const totalAmountInt = parseInt(totalAmount);
    // Validate amount
    if (!totalAmountInt || totalAmountInt <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    // Find nearest admin based on user location
    let assignedAdmin = null;
    if (shippingAddress && shippingAddress.location) {
      const nearestAdminResult = await findNearestAdmin(
        shippingAddress.location.latitude,
        shippingAddress.location.longitude
      );
      assignedAdmin = nearestAdminResult?.admin?._id || null;
    }

    // Create new order with COD payment method
    const order = new Order({
      user: req.user._id,
      items,
      totalAmount: totalAmountInt,
      shippingAddress,
      paymentMethod: 'COD',
      status: 'Pending',
      paymentStatus: 'Pending',
      assignedToAdmin: assignedAdmin,
      orderInstructions:orderInstruction,
    });

    await order.save();

    // Add order reference to user
    await User.findByIdAndUpdate(req.user._id, {
      $push: { orders: order._id }
    });

    // Send notification to admin about new COD order
    const orderData = {
      orderId: order.orderId,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      status: order.status,
      customerName: req.user.name || req.user.email,
      items: order.items,
      createdAt: order.createdAt,
      assignedToAdmin: assignedAdmin
    };
    
    SocketService.notifyAdminNewOrder(orderData);

    res.status(201).json({
      message: 'Order created successfully',
      order
    });
  } catch (error) {
    console.error('Error creating COD order:', error);
    res.status(500).json({ message: 'Error creating order' });
  }
};

// Confirm COD payment (admin only)
const confirmCODPayment = async (req, res) => {
  try {
    // Check if user is authenticated and is admin
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Update order status
    order.paymentStatus = 'Completed';
    order.status = 'Processing';
    await order.save();

    res.json({
      message: 'COD payment confirmed',
      order
    });
  } catch (error) {
    console.error('Error confirming COD payment:', error);
    res.status(500).json({ message: 'Error confirming payment' });
  }
};

const payWithWallet = async (req, res) => {
  try {
    const userId = req.user._id;
    const { items, totalAmount, shippingAddress ,orderInstruction } = req.body;

    if (!items || !totalAmount || !shippingAddress) {
      return res.status(400).json({ message: 'Incomplete order data' });
    }

    const totalAmountInt = parseInt(totalAmount);
    // Validate amount
    if (!totalAmountInt || totalAmountInt <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    // Fetch user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check if wallet has sufficient balance
    if (user.wallet.balance < totalAmountInt) {
      return res.status(400).json({ message: 'Insufficient wallet balance' });
    }

    // Find nearest admin based on user location
    let assignedAdmin = null;
    if (shippingAddress && shippingAddress.location) {
      const nearestAdminResult = await findNearestAdmin(
        shippingAddress.location.latitude,
        shippingAddress.location.longitude
      );
      assignedAdmin = nearestAdminResult?.admin?._id || null;
    }

    // Deduct amount from wallet (uses method you defined earlier)
    await user.updateWalletBalance(
      totalAmountInt,
      'Debit',
      'Payment for order using wallet'
    );

    // Create new order
    const newOrder = new Order({
      user: userId,
      items,
      totalAmount: totalAmountInt,
      shippingAddress,
      paymentMethod: 'Wallet',
      paymentStatus: 'Completed',
      status: 'Pending',
      assignedToAdmin: assignedAdmin,
      orderInstructions:orderInstruction
    });

    const savedOrder = await newOrder.save();

    // Send notification to admin about new wallet order
    const orderData = {
      orderId: savedOrder.orderId,
      totalAmount: savedOrder.totalAmount,
      paymentMethod: savedOrder.paymentMethod,
      status: savedOrder.status,
      customerName: req.user.name || req.user.email,
      items: savedOrder.items,
      createdAt: savedOrder.createdAt,
      assignedToAdmin: assignedAdmin
    };
    
    SocketService.notifyAdminNewOrder(orderData);

    res.status(201).json({
      message: 'Payment successful using wallet',
      order: savedOrder,
      newWalletBalance: user.wallet.balance
    });
  } catch (error) {
    console.error('Wallet payment failed:', error);
    res.status(500).json({ message: 'Wallet payment failed' });
  }
};

// Refund money to wallet when order is cancelled
const refundToWallet = async (req, res) => {
  console.log('====================================');
  console.log("refund");
  console.log('====================================');
  try {
    const { orderId } = req.params;

    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Verify that the order belongs to the authenticated user
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to access this order' });
    }

    // Check if order is already cancelled
    if (order.status !== 'Cancelled') {
      return res.status(400).json({ message: 'Order must be cancelled before refunding' });
    }

    // Check if payment was already refunded
    if (order.paymentStatus === 'Refunded') {
      return res.status(400).json({ message: 'Payment already refunded' });
    }

    // Find the user
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Add refund amount to wallet
    await user.updateWalletBalance(
      order.totalAmount,
      'Credit',
      `Refund for cancelled order ${order.orderId}`
    );

    // Update order payment status
    order.paymentStatus = 'Refunded';
    await order.save();

    res.json({
      message: 'Refund processed successfully',
      refundAmount: order.totalAmount,
      newWalletBalance: user.wallet.balance
    });
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({ message: 'Error processing refund' });
  }
};

// Get wallet transactions
const getWalletTransactions = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find the user and select only the wallet transactions
    const user = await User.findById(userId).select('wallet.transactions wallet.balance');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Optionally sort by latest first
    const sortedTransactions = user.wallet.transactions.sort((a, b) => b.date - a.date);

    res.status(200).json({
      balance: user.wallet.balance,
      transactions: sortedTransactions
    });

  } catch (error) {
    console.error('Error fetching wallet transactions:', error);
    res.status(500).json({ message: 'Error fetching wallet transactions' });
  }
};

// Add money to wallet
const addMoneyToWallet = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!req.user || !amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid user or amount' });
    }

    const amountInt = parseInt(amount);
    // Validate amount
    if (!amountInt || amountInt <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    // Create Razorpay order
    const options = {
      amount: amountInt * 100, // in paise
      currency: 'INR',
      receipt: `wallet_topup_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);

    // You may store this wallet top-up request in DB if needed

    res.json({
      ...order,
      walletTopUp: true
    });
  } catch (error) {
    console.error('Error in addMoneyToWallet:', error);
    res.status(500).json({ message: 'Failed to create wallet top-up order' });
  }
};

// Verify wallet top-up
const verifyWalletTopUp = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount
    } = req.body;

    if (!req.user || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !amount) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const amountInt = parseInt(amount);
    // Validate amount
    if (!amountInt || amountInt <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: 'Invalid signature' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // ✅ Ensure wallet and transactions exist
    if (!user.wallet) {
      user.wallet = { balance: 0, transactions: [] };
    }
    if (!user.wallet.transactions) {
      user.wallet.transactions = [];
    }

    // 💰 Update balance and log transaction
    user.wallet.balance += amountInt;
    user.wallet.transactions.push({
      amount: amountInt,
      type: 'Credit',
      description: 'Money is added',
      date: new Date()
    });

    await user.save();

    res.json({
      message: 'Wallet topped up successfully',
      newBalance: user.wallet.balance
    });
  } catch (error) {
    console.error('Error verifying wallet top-up:', error);
    res.status(500).json({ message: 'Failed to verify wallet top-up' });
  }
};

module.exports = {
  paymentOrder,
  VerifyOrder,
  handleCODPayment,
  confirmCODPayment,
  payWithWallet,
  refundToWallet,
  getWalletTransactions,
  addMoneyToWallet,
  verifyWalletTopUp  
};