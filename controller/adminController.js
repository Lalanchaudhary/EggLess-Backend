const Order = require('../models/Order');
const Cake = require('../models/Cake');
const User = require('../models/User');
const Admin = require('../models/admin');
const SocketService = require('../services/socketService');

function generateSlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
const parseJSONFields = (body) => {
  const fieldsToParse = [
    "sizes",
    "ingredients",
    "allergens",
    "nutritionInfo",
    "reviewsList"
  ];

  fieldsToParse.forEach(field => {
    if (body[field] && typeof body[field] === "string") {
      try {
        body[field] = JSON.parse(body[field]);
      } catch (err) {
        console.log(`Failed to parse ${field}`);
      }
    }
  });

  return body;
};


// Dashboard Statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const totalRevenue = await Order.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalUsers = await User.countDocuments();
    const totalProducts = await Cake.countDocuments();

    // Get recent orders
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'name email')
      .populate('items.product', 'name price image');

    res.json({
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      totalUsers,
      totalProducts,
      recentOrders
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// User Management
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Order Management
exports.getAllOrders = async (req, res) => {
  try {
    let query = {};

    // If the logged-in user is an admin (not delivery boy), show all orders
    // If it's a delivery boy, show only orders assigned to them
    if (req.admin && req.admin.role === 'delivery_boy') {
      query.assignedToDelievery_Boy = req.admin._id;
    } else if (req.admin && req.admin.role === 'admin') {
      // For admin users, show orders assigned to them or unassigned orders
      query.$or = [
        { assignedToAdmin: req.admin._id },
        { assignedToAdmin: null }
      ];
    }

    const orders = await Order.find(query)
      .populate('user', 'name email')
      .populate('items.product', 'name price image')
      .populate('assignedToAdmin', 'name email')
      .populate('assignedToDelievery_Boy', 'name email')
      .sort({ createdAt: -1 });
    res.json({ orders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('items.product', 'name price');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({ order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid order status' });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    order.status = status;

    await order.save();

    res.json({ message: 'Order status updated successfully', order });
  } catch (error) {
    console.error('Order status update error:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
};

exports.assignOrderToAdmin = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { adminId } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Verify the admin exists and is active
    const admin = await Admin.findById(adminId);
    if (!admin || !admin.isActive || admin.role !== 'admin') {
      return res.status(400).json({ error: 'Invalid admin or admin not active' });
    }

    order.assignedToAdmin = adminId;
    await order.save();
    res.json({
      message: 'Order assigned to admin successfully',
      order: await order.populate('assignedToAdmin', 'name email')
    });
  } catch (error) {
    console.error('Order assignment error:', error);
    res.status(500).json({ error: 'Failed to assign order' });
  }
};

// Product Management
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Cake.find().sort({ createdAt: -1 });
    res.json({ products });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    req.body = parseJSONFields(req.body);
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Cake name is required" });
    }

    // 🟢 Generate slug safely
    let slug = generateSlug(name);

    const existingCake = await Cake.findOne({ slug });
    if (existingCake) {
      slug = `${slug}-${Date.now()}`;
    }

    // 🟢 Prepare safe body (prevent slug/image overwrite)
    const { slug: bodySlug, image: bodyImage, ...rest } = req.body;

    // 🟢 If image uploaded via multer → use full URL
    let imageUrl = "";
    if (req.file) {
      imageUrl = `https://egglesscake-backend.fly.dev/uploads/${req.file.filename}`;
    } 
    // 🟢 If no new image but frontend sent Firebase URL → allow it
    else if (bodyImage) {
      imageUrl = bodyImage;
    }

    const cake = new Cake({
      ...rest,
      slug,
      image: imageUrl,
    });

    const savedCake = await cake.save();

    res.status(201).json({
      success: true,
      message: "Cake created successfully",
      data: savedCake,
    });

  } catch (error) {
    console.error("Create Cake Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    req.body = parseJSONFields(req.body);
    const cake = await Cake.findById(req.params.id);
    if (!cake) {
      return res.status(404).json({ message: "Cake not found" });
    }

    // 🟢 If name updated → regenerate slug
    if (req.body.name && req.body.name !== cake.name) {
      let newSlug = generateSlug(req.body.name);

      const existingCake = await Cake.findOne({ slug: newSlug });
      if (existingCake && existingCake._id.toString() !== cake._id.toString()) {
        newSlug = `${newSlug}-${Date.now()}`;
      }

      cake.slug = newSlug;
    }

    // 🟢 If new image uploaded → delete old image + save new one
    if (req.file) {

      // Delete old image ONLY if it is local upload
      if (cake.image && cake.image.includes("/uploads/")) {
        const filename = cake.image.split("/uploads/")[1];
        const oldImagePath = path.join(__dirname, "..", "uploads", filename);

        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      // Save new full image URL
      cake.image = `https://egglesscake-backend.fly.dev/uploads/${req.file.filename}`;
    }


const { slug, image, ...rest } = req.body;
Object.assign(cake, rest);


    const updatedCake = await cake.save();

    res.status(200).json({
      success: true,
      message: "Cake updated successfully",
      data: updatedCake
    });

  } catch (error) {
    console.error("Update Cake Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Cake.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Analytics
exports.getSalesAnalytics = async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;
    let dateFilter = {};

    const now = new Date();
    switch (period) {
      case 'daily':
        dateFilter = {
          createdAt: {
            $gte: new Date(now.setDate(now.getDate() - 7))
          }
        };
        break;
      case 'weekly':
        dateFilter = {
          createdAt: {
            $gte: new Date(now.setDate(now.getDate() - 30))
          }
        };
        break;
      case 'monthly':
        dateFilter = {
          createdAt: {
            $gte: new Date(now.setMonth(now.getMonth() - 6))
          }
        };
        break;
    }

    const salesData = await Order.aggregate([
      { $match: { ...dateFilter, status: 'completed' } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: period === 'daily' ? '%Y-%m-%d' : '%Y-%m',
              date: '$createdAt'
            }
          },
          sales: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    const totalSales = salesData.reduce((sum, item) => sum + item.sales, 0);
    const totalOrders = salesData.reduce((sum, item) => sum + item.orders, 0);
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    res.json({
      salesTrend: salesData.map(item => ({
        date: item._id,
        sales: item.sales,
        orders: item.orders
      })),
      totalSales,
      totalOrders,
      averageOrderValue
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getUserAnalytics = async (req, res) => {
  try {
    const userStats = await User.aggregate([
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m',
              date: '$createdAt'
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });

    res.json({
      userTrend: userStats.map(item => ({
        date: item._id,
        count: item.count
      })),
      totalUsers,
      activeUsers
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getProductAnalytics = async (req, res) => {
  try {
    const topProducts = await Order.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          sales: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          quantity: { $sum: '$items.quantity' }
        }
      },
      { $sort: { sales: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' }
    ]);

    const categoryDistribution = await Cake.aggregate([
      {
        $group: {
          _id: '$category',
          value: { $sum: 1 }
        }
      },
      {
        $project: {
          name: '$_id',
          value: 1,
          _id: 0
        }
      }
    ]);

    res.json({
      topProducts: topProducts.map(item => ({
        name: item.product.name,
        sales: item.sales,
        quantity: item.quantity
      })),
      categoryDistribution
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delivery Management
exports.getAllDeliveryBoys = async (req, res) => {
  try {
    const deliveryBoys = await Admin.find({ role: 'delivery_boy' })
      .select('-password')
      .sort({ createdAt: -1 });
    res.json({ deliveryBoys });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createDeliveryBoy = async (req, res) => {
  try {
    const deliveryBoy = new Admin({
      ...req.body,
      role: 'delivery_boy',
      permissions: ['manage_delivery']
    });
    await deliveryBoy.save();
    res.status(201).json({ deliveryBoy: deliveryBoy.getProfile() });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateDeliveryBoy = async (req, res) => {
  try {
    const deliveryBoy = await Admin.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).select('-password');

    if (!deliveryBoy) {
      return res.status(404).json({ message: 'Delivery boy not found' });
    }

    res.json({ deliveryBoy: deliveryBoy.getProfile() });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteDeliveryBoy = async (req, res) => {
  try {
    const deliveryBoy = await Admin.findByIdAndDelete(req.params.id);
    if (!deliveryBoy) {
      return res.status(404).json({ message: 'Delivery boy not found' });
    }
    res.json({ message: 'Delivery boy deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.assignOrderToDeliveryBoy = async (req, res) => {
  console.log('====================================');
  console.log("Order assign", req.body);
  console.log('====================================');
  try {
    const { orderId, deliveryBoyId } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const deliveryBoy = await Admin.findOne({ _id: deliveryBoyId, role: 'delivery_boy' });
    if (!deliveryBoy) {
      return res.status(404).json({ message: 'Delivery boy not found' });
    }

    order.assignedToDelievery_Boy = deliveryBoyId;
    order.status = 'Shipped';
    await order.save();
    SocketService.notifyDeliveryBoyOrderAssigned(order);
    res.json({ message: 'Order assigned successfully', order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getDeliveryBoyOrders = async (req, res) => {

  try {
    const deliveryBoyId = req.admin.id;
    const orders = await Order.find({ assignedToDelievery_Boy: deliveryBoyId })
      .populate('user', 'name email')
      .populate('items.product', 'name price')
      .sort({ createdAt: -1 });

    res.json({ orders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getDeliveryBoyOrderById = async (req, res) => {

  try {
    const deliveryBoyId = req.admin.id;
    const { orderId } = req.params;
    const order = await Order.findOne({ _id: orderId, assignedToDelievery_Boy: deliveryBoyId })
      .populate('user', 'name email phoneNumber')
      .populate('items.product', 'name price image')
      .populate('assignedToDelievery_Boy', 'name email');
    if (!order) {
      return res.status(404).json({ message: 'Order not found or not assigned to you' });
    }

    res.json({ order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getDeliveryBoyProfile = async (req, res) => {
  try {
    const deliveryBoyId = req.admin.id;
    const deliveryBoy = await Admin.findById(deliveryBoyId).select('-password');

    if (!deliveryBoy || deliveryBoy.role !== 'delivery_boy') {
      return res.status(404).json({ message: 'Delivery boy not found' });
    }

    res.json({ profile: deliveryBoy });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateDeliveryBoyOrderStatus = async (req, res) => {
  try {
    const deliveryBoyId = req.admin.id;
    const { orderId } = req.params;
    const { status, paymentStatus } = req.body;

    const order = await Order.findOne({ _id: orderId, assignedToDelievery_Boy: deliveryBoyId });

    if (!order) {
      return res.status(404).json({ message: 'Order not found or not assigned to you' });
    }

    // Update order status if provided
    if (status) {
      const validStatuses = ['Delivered', 'Cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status update for delivery boy' });
      }
      order.status = status;
      if (status === 'Delivered') {
        order.actualDelivery = new Date();
        // Auto-complete payment when order is delivered
        order.paymentStatus = 'Completed';
      }
    }

    // Update payment status if provided
    if (paymentStatus) {
      const validPaymentStatuses = ['Pending', 'Completed', 'Failed'];
      if (!validPaymentStatuses.includes(paymentStatus)) {
        return res.status(400).json({ message: 'Invalid payment status' });
      }
      order.paymentStatus = paymentStatus;
    }

    await order.save();

    const message = status
      ? `Order status updated to ${status}`
      : `Payment status updated to ${paymentStatus}`;

    res.json({ message, order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.verifyCODPayment = async (req, res) => {
  try {
    const deliveryBoyId = req.admin.id;
    const { orderId } = req.params;
    const { amount, notes } = req.body;

    // Validate required fields
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const order = await Order.findOne({ _id: orderId, assignedToDelievery_Boy: deliveryBoyId });

    if (!order) {
      return res.status(404).json({ message: 'Order not found or not assigned to you' });
    }

    // Check if order is COD
    if (order.paymentMethod !== 'COD') {
      return res.status(400).json({ message: 'This order is not a COD order' });
    }

    // Check if payment is already completed
    if (order.paymentStatus === 'Completed') {
      return res.status(400).json({ message: 'Payment already completed' });
    }

    // Verify amount matches order total
    if (amount !== order.totalAmount) {
      return res.status(400).json({
        message: `Amount mismatch. Expected: ₹${order.totalAmount}, Received: ₹${amount}`
      });
    }

    // Update order payment status
    order.paymentStatus = 'Completed';
    order.paymentDetails = {
      verifiedBy: deliveryBoyId,
      verifiedAt: new Date(),
      amount: amount,
      notes: notes || '',
      method: 'COD'
    };

    await order.save();

    // Send notification to admin about COD payment completion
    const orderData = {
      orderId: order.orderId,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      customerName: order.user.name || order.user.email,
      verifiedBy: req.admin.name || req.admin.email,
      verifiedAt: order.paymentDetails.verifiedAt
    };

    // You can add socket notification here if needed
    // SocketService.notifyAdminCODPaymentCompleted(orderData);

    res.json({
      message: 'COD payment verified successfully',
      order,
      paymentDetails: order.paymentDetails
    });
  } catch (error) {
    console.error('Error verifying COD payment:', error);
    res.status(500).json({ message: 'Error verifying COD payment' });
  }
};

// FCM Token Management
exports.updateFCMToken = async (req, res) => {

  try {
    console.log('updateFCMToken called with body:', req.body);
    const { userId, fcmToken, userRole } = req.body;

    if (!userId || !fcmToken) {
      console.log('Missing userId or fcmToken');
      return res.status(400).json({ message: 'User ID and FCM token are required' });
    }

    // Update the connected users map with the new FCM token
    if (global.connectedUsers) {
      const existingUser = global.connectedUsers.get(userId);
      if (existingUser) {
        existingUser.fcmToken = fcmToken;
        existingUser.role = userRole || existingUser.role;
        global.connectedUsers.set(userId, existingUser);
      } else {
        global.connectedUsers.set(userId, {
          socketId: null, // Will be set when user connects via Socket.IO
          fcmToken: fcmToken,
          role: userRole || 'user'
        });
      }
    }

    // Also update the user's FCM token in the database
    const user = await Admin.findById(userId);
    console.log('Result of Admin.findById:', user);
    if (user) {
      user.fcmToken = fcmToken;
      await user.save();
      console.log('FCM token saved to admin:', user._id, user.fcmToken);
    } else {
      console.log('Admin not found for userId:', userId);
    }

    // Check if Firebase is initialized
    if (global.firebaseInitialized) {
      res.json({
        message: 'FCM token updated successfully',
        firebaseStatus: 'enabled'
      });
    } else {
      res.json({
        message: 'FCM token updated successfully (Firebase notifications disabled)',
        firebaseStatus: 'disabled'
      });
    }
  } catch (error) {
    console.error('❌ Error updating FCM token:', error);
    res.status(500).json({ message: 'Failed to update FCM token' });
  }
};

exports.getAdminDetails = async (req, res) => {
  try {
    const admin = await Admin.findOne({ role: 'admin' }).select('location');
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    res.json(admin);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find({
      role: 'admin',
      isActive: true
    }).select('name email phoneNumber location');
    res.json({ admins });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 