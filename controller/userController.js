const User = require('../models/User');
const jwt = require('jsonwebtoken');
const Order=require("../models/Order")
// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Check if user exists with phone number
exports.checkPhoneNumber = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser) {
      // If user exists, generate token and return user data
      const token = generateToken(existingUser._id);
      return res.status(200).json({
        message: 'User exists',
        isExistingUser: true,
        user: {
          _id: existingUser._id,
          name: existingUser.name,
          email: existingUser.email,
          phoneNumber: existingUser.phoneNumber,
          isPhoneVerified: existingUser.isPhoneVerified
        },
        token
      });
    }

    // If user doesn't exist, return success but indicate new user
    res.status(200).json({
      message: 'New user',
      isExistingUser: false
    });
  } catch (error) {
    console.error('Phone check error:', error);
    res.status(400).json({ error: error.message });
  }
};

// Register new user with phone number
exports.register = async (req, res) => {
  try {
    const { name, email, phoneNumber } = req.body;
    console.log(req.body);
    
    
    // Check if user already exists with phone number
    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser) {
      return res.status(400).json({ error: 'Phone number already registered' });
    }

    // Check if user already exists with email
    if (email) {
      const existingUserByEmail = await User.findOne({ email });
      if (existingUserByEmail) {
        return res.status(400).json({ error: 'Email already registered' });
      }
    }

    // Create new user
    const user = new User({
      name,
      email,
      phoneNumber,
      isPhoneVerified: true, // Since we're using Firebase phone auth
      createdAt: new Date(),
      // wallet: {
      //   balance: 0,
      //   transactions: []
      // },
      // settings: {
      //   notifications: {
      //     email: true,
      //     sms: true,
      //     push: true
      //   },
      //   privacy: {
      //     profileVisibility: 'public',
      //     showPhoneNumber: false
      //   },
      //   security: {
      //     twoFactorAuth: false
      //   }
      // }
    });

    await user.save();

    const token = generateToken(user._id);
    res.status(201).json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        isPhoneVerified: user.isPhoneVerified
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ error: error.message });
  }
};

// Login with phone number
exports.loginWithPhone = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(404).json({ error: 'User not found. Please register first.' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);
    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        isPhoneVerified: user.isPhoneVerified
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(400).json({ error: error.message });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user._id);
    res.json({ user, token });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get user profile
exports.getProfile = async (req, res) => {
  
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  const updates = Object.keys(req.body);
  console.log(req.body);
  
  const allowedUpdates = ['name', 'email', 'phoneNumber', 'profilePicture'];
  const isValidOperation = updates.every(update => allowedUpdates.includes(update));

  if (!isValidOperation) {
    return res.status(400).json({ error: 'Invalid updates' });
  }

  try {
    updates.forEach(update => req.user[update] = req.body[update]);
    await req.user.save();
    res.json(req.user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Add new address
exports.addAddress = async (req, res) => {
  try {
    req.user.addresses.push(req.body);
    await req.user.save();
    res.status(201).json(req.user.addresses);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update address
exports.updateAddress = async (req, res) => {
  try {
    const address = req.user.addresses.id(req.params.addressId);
    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }

    Object.assign(address, req.body);
    await req.user.save();
    res.json(req.user.addresses);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete address
exports.deleteAddress = async (req, res) => {
  try {
    req.user.addresses = req.user.addresses.filter(
      address => address._id.toString() !== req.params.addressId
    );
    await req.user.save();
    res.json(req.user.addresses);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Add UPI account
exports.addUPI = async (req, res) => {
  try {
    req.user.upiAccounts.push(req.body);
    await req.user.save();
    res.status(201).json(req.user.upiAccounts);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update UPI account
exports.updateUPI = async (req, res) => {
  try {
    const upiAccount = req.user.upiAccounts.id(req.params.upiId);
    if (!upiAccount) {
      return res.status(404).json({ error: 'UPI account not found' });
    }

    Object.assign(upiAccount, req.body);
    await req.user.save();
    res.json(req.user.upiAccounts);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete UPI account
exports.deleteUPI = async (req, res) => {
  try {
    req.user.upiAccounts = req.user.upiAccounts.filter(
      upi => upi._id.toString() !== req.params.upiId
    );
    await req.user.save();
    res.json(req.user.upiAccounts);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Add money to wallet
exports.addMoney = async (req, res) => {
  try {
    const { amount } = req.body;
    req.user.wallet.balance += amount;
    req.user.wallet.transactions.push({
      type: 'Credit',
      amount,
      description: 'Added to wallet'
    });
    await req.user.save();
    res.json(req.user.wallet);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get wallet transactions
exports.getWalletTransactions = async (req, res) => {
  try {
    res.json(req.user.wallet.transactions);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update account settings
exports.updateSettings = async (req, res) => {
  try {
    const { notifications, privacy, security } = req.body;
    
    if (notifications) {
      req.user.settings.notifications = {
        ...req.user.settings.notifications,
        ...notifications
      };
    }
    
    if (privacy) {
      req.user.settings.privacy = {
        ...req.user.settings.privacy,
        ...privacy
      };
    }
    
    if (security) {
      req.user.settings.security = {
        ...req.user.settings.security,
        ...security
      };
    }

    await req.user.save();
    res.json(req.user.settings);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get orders
exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('user', 'name email phoneNumber')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Cancel order
exports.cancelOrder = async (req, res) => {
  console.log('====================================');
  console.log("Cancel order");
  console.log('====================================');
  try {
    const { orderId } = req.params;
    
    // Find the order and verify ownership
    const order = await Order.findOne({ 
      _id: orderId,
      user: req.user._id 
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if order can be cancelled
    if (order.status !== 'Pending') {
      return res.status(400).json({ 
        error: 'Only pending orders can be cancelled' 
      });
    }

    // Update order status
    order.status = 'Cancelled';
    order.cancelledAt = new Date();
    order.cancellationReason = req.body.reason || 'Cancelled by user';
    
    await order.save();
    res.json({
      message: 'Order cancelled successfully',
      order
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(400).json({ error: error.message });
  }
};


