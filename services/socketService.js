class SocketService {
  // Check if io is available
  static isIoAvailable() {
    return global.io && typeof global.io.to === 'function';
  }

  // Send notification to admin when a new order is placed
  static notifyAdminNewOrder(orderData) {
    try {
      if (!this.isIoAvailable()) {
        console.warn('⚠️ Socket.IO not available, skipping notification');
        return false;
      }

      const notification = {
        type: 'NEW_ORDER',
        message: `New order #${orderData.orderId} has been placed`,
        order: {
          orderId: orderData.orderId,
          totalAmount: orderData.totalAmount,
          paymentMethod: orderData.paymentMethod,
          status: orderData.status,
          customerName: orderData.customerName || 'Unknown',
          items: orderData.items,
          createdAt: orderData.createdAt
        },
        timestamp: new Date().toISOString()
      };

      // Emit to admin room
      global.io.to('admin_room').emit('admin_notification', notification);
      
      console.log('📢 Admin notification sent for order:', orderData.orderId);
      return true;
    } catch (error) {
      console.error('❌ Error sending admin notification:', error);
      return false;
    }
  }

  // Send notification to admin when order status changes
  static notifyAdminOrderStatusChange(orderData, oldStatus, newStatus) {
    try {
      if (!this.isIoAvailable()) {
        console.warn('⚠️ Socket.IO not available, skipping notification');
        return false;
      }

      const notification = {
        type: 'ORDER_STATUS_CHANGE',
        message: `Order #${orderData.orderId} status changed from ${oldStatus} to ${newStatus}`,
        order: {
          orderId: orderData.orderId,
          oldStatus,
          newStatus,
          customerName: orderData.customerName || 'Unknown',
          updatedAt: orderData.updatedAt
        },
        timestamp: new Date().toISOString()
      };

      // Emit to admin room
      global.io.to('admin_room').emit('admin_notification', notification);
      
      console.log('📢 Admin notification sent for status change:', orderData.orderId);
      return true;
    } catch (error) {
      console.error('❌ Error sending admin notification:', error);
      return false;
    }
  }

  // Send notification to admin when payment is completed
  static notifyAdminPaymentCompleted(orderData) {
    try {
      if (!this.isIoAvailable()) {
        console.warn('⚠️ Socket.IO not available, skipping notification');
        return false;
      }

      const notification = {
        type: 'PAYMENT_COMPLETED',
        message: `Payment completed for order #${orderData.orderId}`,
        order: {
          orderId: orderData.orderId,
          totalAmount: orderData.totalAmount,
          paymentMethod: orderData.paymentMethod,
          paymentStatus: orderData.paymentStatus,
          customerName: orderData.customerName || 'Unknown'
        },
        timestamp: new Date().toISOString()
      };

      // Emit to admin room
      global.io.to('admin_room').emit('admin_notification', notification);
      
      console.log('📢 Admin notification sent for payment completion:', orderData.orderId);
      return true;
    } catch (error) {
      console.error('❌ Error sending admin notification:', error);
      return false;
    }
  }

  // Send notification to user when order status changes
  static notifyUserOrderStatusChange(userId, orderData, newStatus) {
    try {
      if (!this.isIoAvailable()) {
        console.warn('⚠️ Socket.IO not available, skipping notification');
        return false;
      }

      const notification = {
        type: 'ORDER_STATUS_UPDATE',
        message: `Your order #${orderData.orderId} status has been updated to ${newStatus}`,
        order: {
          orderId: orderData.orderId,
          newStatus,
          updatedAt: orderData.updatedAt
        },
        timestamp: new Date().toISOString()
      };

      // Emit to specific user
      global.io.to(`user_${userId}`).emit('user_notification', notification);
      
      console.log('📢 User notification sent for order status:', orderData.orderId);
      return true;
    } catch (error) {
      console.error('❌ Error sending user notification:', error);
      return false;
    }
  }

  // Get connected admin count
  static getConnectedAdminCount() {
    try {
      if (!this.isIoAvailable()) {
        return 0;
      }
      const adminRoom = global.io.sockets.adapter.rooms.get('admin_room');
      return adminRoom ? adminRoom.size : 0;
    } catch (error) {
      console.error('❌ Error getting admin count:', error);
      return 0;
    }
  }

  // Get connected user count
  static getConnectedUserCount() {
    try {
      if (!this.isIoAvailable()) {
        return 0;
      }
      const userRoom = global.io.sockets.adapter.rooms.get('user_room');
      return userRoom ? userRoom.size : 0;
    } catch (error) {
      console.error('❌ Error getting user count:', error);
      return 0;
    }
  }
}

module.exports = SocketService; 