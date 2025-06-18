# Socket.IO Notification System

This document explains the Socket.IO implementation for real-time notifications in the Eggless Cake application.

## Overview

The Socket.IO notification system provides real-time notifications to admin users when:
- New orders are placed
- Payments are completed
- Order status changes

## Backend Implementation

### 1. Server Setup (`index.js`)

The main server file has been updated to include Socket.IO with the following features:

- **CORS Configuration**: Properly configured for both development and production
- **Room Management**: Separate rooms for admin and user connections
- **Connection Handling**: Automatic room assignment based on user type

```javascript
// Admin connection
socket.on("admin_connect", (data) => {
  socket.join("admin_room");
  socket.emit("admin_connected", { message: "Admin connected successfully" });
});

// User connection
socket.on("user_connect", (data) => {
  socket.join("user_room");
  socket.emit("user_connected", { message: "User connected successfully" });
});
```

### 2. Socket Service (`services/socketService.js`)

A dedicated service class handles all notification logic:

#### Available Methods:

- `notifyAdminNewOrder(orderData)` - Notifies admin of new orders
- `notifyAdminPaymentCompleted(orderData)` - Notifies admin of completed payments
- `notifyAdminOrderStatusChange(orderData, oldStatus, newStatus)` - Notifies admin of status changes
- `notifyUserOrderStatusChange(userId, orderData, newStatus)` - Notifies users of their order updates
- `getConnectedAdminCount()` - Returns number of connected admins
- `getConnectedUserCount()` - Returns number of connected users

#### Notification Structure:

```javascript
{
  type: 'NEW_ORDER', // or 'PAYMENT_COMPLETED', 'ORDER_STATUS_CHANGE'
  message: 'New order #ORD24010001 has been placed',
  order: {
    orderId: 'ORD24010001',
    totalAmount: 1500,
    paymentMethod: 'Razorpay',
    status: 'Pending',
    customerName: 'John Doe',
    items: [...],
    createdAt: '2024-01-01T10:00:00.000Z'
  },
  timestamp: '2024-01-01T10:00:00.000Z'
}
```

### 3. Payment Controller Integration

The payment controller has been updated to send notifications automatically:

- **Razorpay Orders**: Notifications sent when orders are created and payments are verified
- **COD Orders**: Notifications sent when orders are placed
- **Wallet Orders**: Notifications sent when orders are completed

## Frontend Implementation

### 1. Notification Panel Component (`src/components/admin/NotificationPanel.js`)

A React component that:
- Connects to Socket.IO server
- Displays real-time notifications
- Shows notification count badge
- Supports browser notifications
- Allows clearing notifications

#### Features:
- **Real-time Updates**: Automatically receives and displays new notifications
- **Visual Indicators**: Different icons and colors for different notification types
- **Browser Notifications**: Shows desktop notifications when panel is closed
- **Connection Status**: Visual indicator of Socket.IO connection status

### 2. Admin Layout Integration

The notification panel is integrated into the admin layout header, providing:
- Easy access to notifications
- Non-intrusive design
- Consistent placement across all admin pages

## Usage

### Starting the Backend

```bash
cd backend
npm install
npm run dev
```

### Testing Notifications

Run the test file to verify notifications work:

```bash
cd backend
node test-socket.js
```

### Frontend Setup

1. Install socket.io-client:
```bash
npm install socket.io-client
```

2. The notification panel will automatically connect when an admin user visits any admin page.

## Configuration

### Environment Variables

Make sure these environment variables are set in your `.env` file:

```env
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
PORT=4000
```

### CORS Settings

The Socket.IO server is configured to accept connections from:
- Development: `http://localhost:3000`, `http://127.0.0.1:3000`
- Production: Uses `FRONTEND_URL` environment variable

## Notification Types

### 1. NEW_ORDER
Triggered when:
- User places a Razorpay order
- User places a COD order
- User places a wallet order

### 2. PAYMENT_COMPLETED
Triggered when:
- Razorpay payment is verified
- COD payment is confirmed by admin
- Wallet payment is processed

### 3. ORDER_STATUS_CHANGE
Triggered when:
- Admin changes order status
- System updates order status

## Troubleshooting

### Common Issues:

1. **Connection Failed**
   - Check if backend server is running on port 4000
   - Verify CORS settings match your frontend URL
   - Check browser console for connection errors

2. **Notifications Not Appearing**
   - Ensure admin is connected to the admin room
   - Check if notification permissions are granted
   - Verify Socket.IO events are being emitted

3. **Browser Notifications Not Working**
   - Request notification permissions manually
   - Check browser settings for notification permissions
   - Ensure HTTPS in production (required for notifications)

### Debug Mode

Enable debug logging by adding to your backend:

```javascript
const io = new Server(server, {
  cors: { ... },
  debug: true
});
```

## Security Considerations

1. **Authentication**: Ensure only authenticated admin users can connect to admin rooms
2. **Input Validation**: Validate all data before sending notifications
3. **Rate Limiting**: Consider implementing rate limiting for Socket.IO events
4. **Environment**: Use HTTPS in production for secure WebSocket connections

## Future Enhancements

Potential improvements:
- Notification persistence in database
- Email/SMS notifications as backup
- Custom notification preferences
- Notification history and analytics
- Push notifications for mobile apps 