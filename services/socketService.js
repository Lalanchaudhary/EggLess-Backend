const admin = require('firebase-admin');
const Admin = require('../models/admin');
const User = require('../models/User');

class SocketService {
  static isIoAvailable() {
    return global.io && typeof global.io.to === 'function';
  }

  static async getAllAdminFCMTokens() {
    const admins = await Admin.find({ fcmToken: { $ne: null } });
    return admins.map(admin => admin.fcmToken);
  }

  static async getUserFCMToken(userId) {
    const user = await User.findById(userId);
    return user?.fcmToken || null;
  }

  static async sendFCMToMultiple(tokens, notification, data = {}) {
    for (const token of tokens) {
      try {
        await admin.messaging().send({
          token,
          notification,
          data
        });
        console.log('📬 FCM: Sent to token', token);
      } catch (err) {
        console.error('❌ Error sending FCM to token:', token, err.message);
      }
    }
  }

  static async notifyAdminNewOrder(orderData) {
    try {
      const message = `New order #${orderData.orderId} has been placed`;

      if (this.isIoAvailable()) {
        global.io.to('admin_room').emit('admin_notification', {
          type: 'NEW_ORDER',
          message,
          order: orderData,
          timestamp: new Date().toISOString()
        });
        console.log('📢 Socket.IO: Admin notification sent for order:', orderData.orderId);
      }

      const tokens = await this.getAllAdminFCMTokens();
      if (tokens.length > 0) {
        await this.sendFCMToMultiple(tokens, {
          title: '🧁 New Order Received',
          body: message
        }, {
          type: 'new_order',
          orderId: orderData.orderId
        });
      }

      return true;
    } catch (error) {
      console.error('❌ Error sending admin new order notification:', error);
      return false;
    }
  }

  static async notifyAdminOrderStatusChange(orderData, oldStatus, newStatus) {
    try {
      const message = `Order #${orderData.orderId} status changed from ${oldStatus} to ${newStatus}`;

      if (this.isIoAvailable()) {
        global.io.to('admin_room').emit('admin_notification', {
          type: 'ORDER_STATUS_CHANGE',
          message,
          order: {
            orderId: orderData.orderId,
            oldStatus,
            newStatus,
            updatedAt: orderData.updatedAt
          },
          timestamp: new Date().toISOString()
        });
        console.log('📢 Socket.IO: Admin status update sent:', orderData.orderId);
      }

      const tokens = await this.getAllAdminFCMTokens();
      if (tokens.length > 0) {
        await this.sendFCMToMultiple(tokens, {
          title: '📦 Order Status Updated',
          body: message
        }, {
          type: 'order_status_change',
          orderId: orderData.orderId
        });
      }

      return true;
    } catch (error) {
      console.error('❌ Error sending status change notification:', error);
      return false;
    }
  }

  static async notifyAdminPaymentCompleted(orderData) {
    try {
      const message = `Payment completed for order #${orderData.orderId}`;

      if (this.isIoAvailable()) {
        global.io.to('admin_room').emit('admin_notification', {
          type: 'PAYMENT_COMPLETED',
          message,
          order: {
            orderId: orderData.orderId,
            paymentStatus: orderData.paymentStatus,
            totalAmount: orderData.totalAmount,
            paymentMethod: orderData.paymentMethod
          },
          timestamp: new Date().toISOString()
        });
        console.log('📢 Socket.IO: Payment completion sent:', orderData.orderId);
      }

      const tokens = await this.getAllAdminFCMTokens();
      if (tokens.length > 0) {
        await this.sendFCMToMultiple(tokens, {
          title: '💰 Payment Completed',
          body: message
        }, {
          type: 'payment_completed',
          orderId: orderData.orderId
        });
      }

      return true;
    } catch (error) {
      console.error('❌ Error sending payment notification:', error);
      return false;
    }
  }

  static async notifyUserOrderStatusChange(userId, orderData, newStatus) {
    try {
      const message = `Your order #${orderData.orderId} status is now ${newStatus}`;

      if (this.isIoAvailable()) {
        global.io.to(`user_${userId}`).emit('user_notification', {
          type: 'ORDER_STATUS_UPDATE',
          message,
          order: {
            orderId: orderData.orderId,
            newStatus,
            updatedAt: orderData.updatedAt
          },
          timestamp: new Date().toISOString()
        });
        console.log('📢 Socket.IO: User notified for order:', orderData.orderId);
      }

      const fcmToken = await this.getUserFCMToken(userId);
      if (fcmToken) {
        await admin.messaging().send({
          token: fcmToken,
          notification: {
            title: '📦 Order Status Update',
            body: message
          },
          data: {
            type: 'order_status_update',
            orderId: orderData.orderId
          }
        });
        console.log('📬 FCM: User notified for order:', orderData.orderId);
      }

      return true;
    } catch (error) {
      console.error('❌ Error notifying user order status:', error);
      return false;
    }
  }

  static getConnectedAdminCount() {
    try {
      if (!this.isIoAvailable()) return 0;
      const room = global.io.sockets.adapter.rooms.get('admin_room');
      return room ? room.size : 0;
    } catch (error) {
      console.error('❌ Error getting admin count:', error);
      return 0;
    }
  }

  static getConnectedUserCount() {
    try {
      if (!this.isIoAvailable()) return 0;
      const room = global.io.sockets.adapter.rooms.get('user_room');
      return room ? room.size : 0;
    } catch (error) {
      console.error('❌ Error getting user count:', error);
      return 0;
    }
  }
}

module.exports = SocketService;
