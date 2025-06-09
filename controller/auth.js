const User = require("../models/User") 
const Admin = require("../models/admin")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken") 

require('dotenv').config()

// User Authentication
exports.userLogin = async (req, res) => { 
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please provide email and password"
            })
        }

        let user = await User.findOne({ email }).select("+password") 

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Invalid credentials"
            })
        }

        const payload = {
            email: user.email,
            id: user._id,
            role: 'user'
        }

        if (await bcrypt.compare(password, user.password)) {
            let token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" })
            user = user.toObject()
            user.token = token
            user.password = undefined

            const option = {
                expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
                httpOnly: true
            }

            res.cookie("token", token, option).status(200).json({
                success: true,
                token,
                user,
                message: "Login successful"
            })

        } else {
            return res.status(403).json({
                success: false,
                message: "Invalid credentials"
            })
        }

    } catch (e) {
        console.log(e)
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        })
    }
}

exports.userSignup = async (req, res) => {
    try {
        const { name, email, password } = req.body
        const existingUser = await User.findOne({ email })
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "User already exists"
            })
        }

        let hashedpassword;
        try {
            hashedpassword = await bcrypt.hash(password, 10)
        } catch (e) {
            return res.status(500).json({
                success: false,
                message: "Error hashing password"
            })
        }

        const newUser = await User.create({
            name,
            email,
            password: hashedpassword
        })

        return res.status(200).json({
            success: true,
            message: "User created successfully"
        })

    } catch (e) {
        console.log(e)
        return res.status(500).json({
            success: false,
            message: "Please try again later"
        })
    }
}

// Admin Authentication
exports.adminLogin = async (req, res) => {
    try {
        const { email, password, role } = req.body;

        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please provide email and password"
            });
        }

        // Find admin by email
        let admin = await Admin.findOne({ email }).select("+password");

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        // Check if account is active
        if (!admin.isActive) {
            return res.status(403).json({
                success: false,
                message: "Account is deactivated"
            });
        }

        // Validate role if provided
        if (role && admin.role !== role) {
            return res.status(403).json({
                success: false,
                message: `Access denied. ${role} privileges required.`
            });
        }

        // Verify password
        if (!await admin.comparePassword(password)) {
            return res.status(403).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        // Create JWT payload
        const payload = {
            email: admin.email,
            id: admin._id,
            role: admin.role,
            permissions: admin.permissions
        };

        // Generate token
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" });

        // Get admin profile without sensitive data
        admin = admin.getProfile();
        admin.token = token;

        // Update last login
        await Admin.findByIdAndUpdate(admin._id, { 
            lastLogin: new Date(),
            $inc: { loginCount: 1 } // Optional: track login count
        });
        // Set cookie options
        const cookieOptions = {
            expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
            sameSite: 'strict'
        };

        console.log('====================================');
        console.log(req.body);
        console.log('====================================');

        // Send response
        res.cookie("token", token, cookieOptions).status(200).json({
            success: true,
            token,
            admin,
            message: "Login successful"
        });

    } catch (e) {
        console.error('Admin login error:', e);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

exports.adminSignup = async (req, res) => {
    try {
        const { name, email, password, role, phoneNumber, deliveryDetails } = req.body;

        // Check if requesting user is admin
        if (!req.admin || req.admin.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Only admin can create new accounts"
            });
        }

        const existingAdmin = await Admin.findOne({ 
            $or: [{ email }, { phoneNumber }] 
        });
        
        if (existingAdmin) {
            return res.status(400).json({
                success: false,
                message: "Email or phone number already exists"
            });
        }

        // Set default permissions based on role
        let permissions = [];
        if (role === 'admin') {
            permissions = ['manage_users', 'manage_products', 'manage_orders', 'view_analytics'];
        } else if (role === 'delivery_boy') {
            permissions = ['manage_delivery'];
        }

        const newAdmin = await Admin.create({
            name,
            email,
            password,
            role,
            phoneNumber,
            permissions,
            deliveryDetails: role === 'delivery_boy' ? deliveryDetails : undefined
        });

        return res.status(200).json({
            success: true,
            message: `${role} created successfully`,
            admin: newAdmin.getProfile()
        });
    } catch (e) {
        console.log(e);
        return res.status(500).json({
            success: false,
            message: "Please try again later"
        });
    }
};

exports.createFirstAdmin = async (req, res) => {
    try {
        // Check if any admin exists
        const adminExists = await Admin.findOne({ role: 'admin' });
        if (adminExists) {
            return res.status(403).json({
                success: false,
                message: "First admin already exists. Please use the regular signup route."
            });
        }

        const { name, email, password, phoneNumber } = req.body;

        // Validate required fields
        if (!name || !email || !password || !phoneNumber) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required fields"
            });
        }

        // Check if email or phone already exists
        const existingAdmin = await Admin.findOne({ 
            $or: [{ email }, { phoneNumber }] 
        });
        
        if (existingAdmin) {
            return res.status(400).json({
                success: false,
                message: "Email or phone number already exists"
            });
        }

        // Create first admin with all permissions
        const newAdmin = await Admin.create({
            name,
            email,
            password,
            phoneNumber,
            role: 'admin',
            permissions: ['manage_users', 'manage_products', 'manage_orders', 'view_analytics', 'manage_delivery']
        });

        return res.status(200).json({
            success: true,
            message: "First admin created successfully",
            admin: newAdmin.getProfile()
        });
    } catch (e) {
        console.log(e);
        return res.status(500).json({
            success: false,
            message: "Please try again later"
        });
    }
};
