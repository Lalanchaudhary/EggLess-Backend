const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/admin');

exports.protect = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies?.token) {
            token = req.cookies.token;
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to access this route'
            });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Check if it's an admin or user
            if (decoded.role === 'admin' || decoded.role === 'delivery_boy') {
                req.admin = await Admin.findById(decoded.id);
                if (!req.admin) {
                    return res.status(401).json({
                        success: false,
                        message: 'Admin not found'
                    });
                }
            } else {
                req.user = await User.findById(decoded.id);
                if (!req.user) {
                    return res.status(401).json({
                        success: false,
                        message: 'User not found'
                    });
                }
            }
            next();
        } catch (err) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to access this route'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error authenticating user'
        });
    }
};

exports.authorize = (...roles) => {
    return (req, res, next) => {
        const user = req.user || req.admin;
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to access this route'
            });
        }

        if (!roles.includes(user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to access this route'
            });
        }
        next();
    };
};


