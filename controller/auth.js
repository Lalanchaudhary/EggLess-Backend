const User = require("../models/User")
const Admin = require("../models/admin")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")

require('dotenv').config()

// Admin Authentication
exports.adminLogin = async (req, res) => {
    try {
        const { email, password, role } = req.body;

        // Validate required fields
        if (!email || !password) {
            console.log("Missing email or password");
            return res.status(400).json({
                success: false,
                message: "Please provide email and password"
            });
        }

        // Find admin by email
        let admin = await Admin.findOne({ email }).select("+password");
        console.log("Admin found:", admin ? "Yes" : "No");

        if (!admin) {
            console.log("Admin not found for email:", email);
            return res.status(404).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        // Check if account is active
        if (!admin.isActive) {
            console.log("Admin account is deactivated");
            return res.status(403).json({
                success: false,
                message: "Account is deactivated"
            });
        }

        // Validate role if provided
        if (role && admin.role !== role) {
            console.log("Role mismatch:", { expected: role, actual: admin.role });
            return res.status(403).json({
                success: false,
                message: `Access denied. ${role} privileges required.`
            });
        }

        // Verify password
        const isPasswordValid = await admin.comparePassword(password);
        console.log("Password validation:", isPasswordValid ? "Success" : "Failed");

        if (!isPasswordValid) {
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
        console.log("JWT token generated successfully");

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
            secure: true,
            sameSite:'none'
        };

        console.log("Cookie options:", cookieOptions);

        // Send response
        res.cookie("token", token, cookieOptions).status(200).json({
            success: true,
            token,
            admin,
            message: "Login successful"
        });

        console.log("Admin login successful for:", email);

    } catch (e) {
        console.error('Admin login error:', e);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

exports.verifyAdmin = async (req, res) => {
    try {
        const admin = await Admin.findById(req.user.id);
        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }
        res.json({ success: true, admin: admin.getProfile() });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
};

exports.adminSignup = async (req, res) => {
    try {
        const { name, email, password,location, role, phoneNumber, deliveryDetails} = req.body;


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
            location,
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

        const { name, email, password,location, phoneNumber } = req.body;

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
            location,
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
