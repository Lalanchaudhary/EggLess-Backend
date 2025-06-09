const Order = require('../models/Order');
const Product = require('../models/Cake');
const User = require('../models/User');
const Admin = require('../models/admin');

// Dashboard Statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const totalRevenue = await Order.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalUsers = await User.countDocuments();
    const totalProducts = await Product.countDocuments();

    // Get recent orders
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'name email')
      .populate('items.product', 'name price');

      console.log('====================================');
      console.log("Hello dash",totalOrders);
      console.log('====================================');

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
    const orders = await Order.find()
      .populate('user', 'name email')
      .populate('items.product', 'name price')
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
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('user', 'name email')
     .populate('items.product', 'name price');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({ order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Product Management
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json({ products });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json({ product });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ product });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
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

    const categoryDistribution = await Product.aggregate([
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