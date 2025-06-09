const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const addressSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Home', 'Work', 'Other'],
    required: true
  },
  street: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  pincode: {
    type: String,
    required: true
  },
  location: {
    latitude: {
      type: Number,
      required: false  // set to true if you always expect coordinates
    },
    longitude: {
      type: Number,
      required: false
    }
  },
  isDefault: {
    type: Boolean,
    default: false
  }
});


const upiAccountSchema = new mongoose.Schema({
  upiId: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  isDefault: {
    type: Boolean,
    default: false
  }
});

const transactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Credit', 'Debit'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
});

const walletSchema = new mongoose.Schema({
  balance: {
    type: Number,
    default: 0
  },
  transactions: [transactionSchema]
});

const membershipSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Basic', 'Premium', 'VIP'],
    default: 'Basic'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  benefits: [{
    type: String
  }]
});

const settingsSchema = new mongoose.Schema({
  notifications: {
    email: {
      type: Boolean,
      default: true
    },
    sms: {
      type: Boolean,
      default: true
    },
    push: {
      type: Boolean,
      default: true
    }
  },
  privacy: {
    profileVisibility: {
      type: String,
      enum: ['Public', 'Private', 'Friends'],
      default: 'Public'
    },
    showEmail: {
      type: Boolean,
      default: false
    },
    showPhone: {
      type: Boolean,
      default: false
    }
  },
  security: {
    twoFactorAuth: {
      type: Boolean,
      default: false
    },
    loginNotifications: {
      type: Boolean,
      default: true
    }
  }
});

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: false,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: false,
    minlength: 6
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  profilePicture: {
    type: String
  },
  addresses: [addressSchema],
  upiAccounts: [upiAccountSchema],
  wallet: {
    type: walletSchema,
    default: () => ({})
  },
  orders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  }],
  membership: {
    type: membershipSchema,
    default: () => ({})
  },
  settings: {
    type: settingsSchema,
    default: () => ({})
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  }
});

// Remove password comparison method since we're using phone auth
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Hash password before saving (only if password is provided)
userSchema.pre('save', async function(next) {
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 8);
  }
  next();
});

// Add method to get user's orders with pagination
userSchema.methods.getOrders = async function(page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  return mongoose.model('Order').find({ user: this._id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('items.product');
};

// Add method to get user's wallet balance
userSchema.methods.getWalletBalance = function() {
  return this.wallet.balance;
};

// Add method to update wallet balance
userSchema.methods.updateWalletBalance = async function(amount, type, description) {
  this.wallet.balance += type === 'Credit' ? amount : -amount;
  this.wallet.transactions.push({
    type,
    amount,
    description
  });
  return this.save();
};

const User = mongoose.model('User', userSchema);

module.exports = User; 