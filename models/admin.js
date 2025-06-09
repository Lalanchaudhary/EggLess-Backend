const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const adminSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters long']
    },
    role: {
        type: String,
        enum: ['admin', 'delivery_boy'],
        default: 'admin'
    },
    phoneNumber: {
        type: String,
        required: [true, 'Phone number is required'],
        unique: true
    },
    permissions: [{
        type: String,
        enum: [
            'manage_users',
            'manage_products',
            'manage_orders',
            'view_analytics',
            'manage_delivery'
        ]
    }],
    // Fields specific to delivery boy
    deliveryDetails: {
        vehicleNumber: String,
        vehicleType: {
            type: String,
            enum: ['bike', 'scooter', 'bicycle', 'other']
        },
        currentLocation: {
            latitude: Number,
            longitude: Number
        },
        isAvailable: {
            type: Boolean,
            default: true
        },
        activeOrders: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order'
        }]
    },
    lastLogin: {
        type: Date
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
adminSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare password
adminSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw error;
    }
};

// Method to check if admin has specific permission
adminSchema.methods.hasPermission = function(permission) {
    return this.permissions.includes(permission);
};

// Method to get admin profile without sensitive data
adminSchema.methods.getProfile = function() {
    const admin = this.toObject();
    delete admin.password;
    return admin;
};

// Method to update delivery boy's location
adminSchema.methods.updateLocation = async function(latitude, longitude) {
    if (this.role === 'delivery_boy') {
        this.deliveryDetails.currentLocation = { latitude, longitude };
        return this.save();
    }
    throw new Error('Only delivery boys can update location');
};

// Method to update delivery boy's availability
adminSchema.methods.updateAvailability = async function(isAvailable) {
    if (this.role === 'delivery_boy') {
        this.deliveryDetails.isAvailable = isAvailable;
        return this.save();
    }
    throw new Error('Only delivery boys can update availability');
};

// Method to assign order to delivery boy
adminSchema.methods.assignOrder = async function(orderId) {
    if (this.role === 'delivery_boy' && this.deliveryDetails.isAvailable) {
        this.deliveryDetails.activeOrders.push(orderId);
        return this.save();
    }
    throw new Error('Cannot assign order to unavailable delivery boy');
};

// Method to complete order delivery
adminSchema.methods.completeOrder = async function(orderId) {
    if (this.role === 'delivery_boy') {
        this.deliveryDetails.activeOrders = this.deliveryDetails.activeOrders.filter(
            order => order.toString() !== orderId.toString()
        );
        return this.save();
    }
    throw new Error('Only delivery boys can complete orders');
};

const Admin = mongoose.model('Admin', adminSchema);

module.exports = Admin;
