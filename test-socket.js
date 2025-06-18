const SocketService = require('./services/socketService');

// Test function to simulate a new order
const testNewOrderNotification = () => {
  console.log('🧪 Testing new order notification...');
  
  const mockOrderData = {
    orderId: 'ORD24010001',
    totalAmount: 1500,
    paymentMethod: 'Razorpay',
    status: 'Pending',
    customerName: 'John Doe',
    items: [
      {
        product: 'Chocolate Cake',
        quantity: 1,
        price: 1500
      }
    ],
    createdAt: new Date()
  };

  // Send notification
  const result = SocketService.notifyAdminNewOrder(mockOrderData);
  
  if (result) {
    console.log('✅ New order notification sent successfully');
  } else {
    console.log('❌ Failed to send new order notification');
  }
};

// Test function to simulate payment completion
const testPaymentCompletedNotification = () => {
  console.log('🧪 Testing payment completed notification...');
  
  const mockOrderData = {
    orderId: 'ORD24010001',
    totalAmount: 1500,
    paymentMethod: 'Razorpay',
    paymentStatus: 'Completed',
    customerName: 'John Doe'
  };

  // Send notification
  const result = SocketService.notifyAdminPaymentCompleted(mockOrderData);
  
  if (result) {
    console.log('✅ Payment completed notification sent successfully');
  } else {
    console.log('❌ Failed to send payment completed notification');
  }
};

// Test function to simulate order status change
const testOrderStatusChangeNotification = () => {
  console.log('🧪 Testing order status change notification...');
  
  const mockOrderData = {
    orderId: 'ORD24010001',
    oldStatus: 'Pending',
    newStatus: 'Processing',
    customerName: 'John Doe',
    updatedAt: new Date()
  };

  // Send notification
  const result = SocketService.notifyAdminOrderStatusChange(mockOrderData, 'Pending', 'Processing');
  
  if (result) {
    console.log('✅ Order status change notification sent successfully');
  } else {
    console.log('❌ Failed to send order status change notification');
  }
};

// Export test functions
module.exports = {
  testNewOrderNotification,
  testPaymentCompletedNotification,
  testOrderStatusChangeNotification
};

// Run tests if this file is executed directly
if (require.main === module) {
  console.log('🚀 Starting Socket.IO notification tests...\n');
  
  // Wait a bit for server to start
  setTimeout(() => {
    testNewOrderNotification();
    
    setTimeout(() => {
      testPaymentCompletedNotification();
      
      setTimeout(() => {
        testOrderStatusChangeNotification();
        console.log('\n✨ All tests completed!');
      }, 1000);
    }, 1000);
  }, 2000);
} 