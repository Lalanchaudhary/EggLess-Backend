const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    unique: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cake',
      required: true,
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
  tax:{
    type:Number,
    default:0
  },
  shippingcharge:{
    type:Number,
    default:0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
    default: 'Pending',
  },
  assignedToDelievery_Boy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
    assignedToAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
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
    orderInstructions: {
    type: String
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
    immutable: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Unique order lookup
orderSchema.index({ orderId: 1 }, { unique: true });

// User order history
orderSchema.index({ user: 1, createdAt: -1 });

// Admin order management
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ assignedToAdmin: 1 });

// Delivery partner
orderSchema.index({ assignedToDelievery_Boy: 1, status: 1 });

// Date range reports
orderSchema.index({ createdAt: -1 });


// Pre-save hook to generate orderId and update updatedAt timestamp
orderSchema.pre('save', async function(next) {
  if (!this.isNew) {
    this.updatedAt = Date.now();
    return next();
  }

  let isUnique = false;

  while (!isUnique) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(100000 + Math.random() * 900000);

    const orderId = `ORD${year}${month}${day}${random}`;
    const exists = await mongoose.models.Order.findOne({ orderId });

    if (!exists) {
      this.orderId = orderId;
      isUnique = true;
    }
  }

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
