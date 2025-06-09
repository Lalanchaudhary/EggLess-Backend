const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');
const User = require('../models/User');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id:'rzp_test_1FGhUyAJx6vnYE',
  key_secret:'c62L38n5PxbRhgbLkEJjmY9U'
});

// Create Razorpay order
const paymentOrder = async (req, res) => {
  console.log(req.body);
  
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { totalAmount, currency = 'INR', shippingAddress, items, userId } = req.body;


    // Validate amount
    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }
    

    const options = {
      amount: totalAmount * 100, // Razorpay expects amount in paise
      currency,
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    console.log('====================================');
    console.log(order);
    console.log('====================================');
    // Create a pending order in our database
    const newOrder = new Order({
      user: req.user._id,
      totalAmount,
      paymentMethod: 'Razorpay',
      status: 'Pending',
      paymentStatus: 'Pending',
      razorpayOrderId: order.id,
      shippingAddress,
      items
    });
    

    await newOrder.save();

    // Add order reference to user
    await User.findByIdAndUpdate(req.user._id, {
      $push: { orders: newOrder._id }
    });

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
  console.log('====================================');
  console.log(req.body);
  console.log('====================================');
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
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { items, shippingAddress, totalAmount } = req.body;

    // Validate required fields
    if (!items || !shippingAddress || !totalAmount) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Create new order with COD payment method
    const order = new Order({
      user: req.user._id,
      items,
      totalAmount,
      shippingAddress,
      paymentMethod: 'COD',
      status: 'Pending',
      paymentStatus: 'Pending'
    });

    await order.save();

    // Add order reference to user
    await User.findByIdAndUpdate(req.user._id, {
      $push: { orders: order._id }
    });

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
    const { items, totalAmount, shippingAddress } = req.body;

    if (!items || !totalAmount || !shippingAddress) {
      return res.status(400).json({ message: 'Incomplete order data' });
    }

    // Fetch user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check if wallet has sufficient balance
    if (user.wallet.balance < totalAmount) {
      return res.status(400).json({ message: 'Insufficient wallet balance' });
    }

    // Deduct amount from wallet (uses method you defined earlier)
    await user.updateWalletBalance(
      totalAmount,
      'Debit',
      'Payment for order using wallet'
    );

    // Create new order
    const newOrder = new Order({
      user: userId,
      items,
      totalAmount,
      shippingAddress,
      paymentMethod: 'Wallet',
      paymentStatus: 'Completed',
      status: 'Processing'
    });

    const savedOrder = await newOrder.save();

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
  console.log('====================================');
  console.log("transaction");
  console.log('====================================');
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


module.exports = {
  paymentOrder,
  VerifyOrder,
  handleCODPayment,
  confirmCODPayment,
  payWithWallet,
  refundToWallet,
  getWalletTransactions
};
  
