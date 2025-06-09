const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    unique: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cake',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
    default: 'Pending'
  },
  paymentMethod: {
    type: String,
    enum: ['COD', 'Razorpay', 'Wallet'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Completed', 'Failed', 'Refunded'],
    default: 'Pending'
  },
  shippingAddress: {
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
        required: function() { return this.location != null; }
      },
      longitude: {
        type: Number,
        required: function() { return this.location != null; }
      }
    }
  },
  deliveryInstructions: {
    type: String
  },
  estimatedDelivery: {
    type: Date
  },
  actualDelivery: {
    type: Date
  },
  trackingNumber: {
    type: String
  },
  razorpayOrderId: {
    type: String
  },
  razorpayPaymentId: {
    type: String
  },
  razorpaySignature: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save hook to generate orderId and update updatedAt timestamp
orderSchema.pre('save', function(next) {
  // Generate unique orderId if new
  if (this.isNew) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.orderId = `ORD${year}${month}${day}${random}`;
  }
  // Always update updatedAt timestamp
  this.updatedAt = Date.now();
  next();
});

// Method to calculate total amount from items
orderSchema.methods.calculateTotal = function() {
  return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
};

// Method to update order status
orderSchema.methods.updateStatus = async function(newStatus) {
  this.status = newStatus;
  if (newStatus === 'Delivered') {
    this.actualDelivery = new Date();
  }
  return this.save();
};

// Method to verify Razorpay payment
orderSchema.methods.verifyPayment = async function(paymentDetails) {
  if (this.paymentMethod === 'Razorpay') {
    this.razorpayPaymentId = paymentDetails.paymentId;
    this.razorpaySignature = paymentDetails.signature;
  }
  this.paymentStatus = 'Completed';
  return this.save();
};

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
