const express = require("express");
const http = require("http"); // Import http module
const { Server } = require("socket.io"); // Import socket.io
const connectDB = require("./config/database");
const cors = require("cors");
require("dotenv").config();
const cookieParser = require("cookie-parser");

const app = express();
const server = http.createServer(app); // Create an HTTP server instance
const io = new Server(server, {
  cors: {
    origin: "*", // Change this to your frontend URL in production
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors());
app.use(cookieParser());
app.use(express.json());

// Import routes
const userRoutes = require("./routes/userRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const cakeRoutes = require("./routes/cakeRoutes");
const adminRoutes = require("./routes/adminRoutes");
const authRoutes = require("./routes/authRoutes");

// Routes
app.use("/users", userRoutes);
app.use("/payment", paymentRoutes);
app.use("/cake", cakeRoutes);
app.use("/admin", adminRoutes);
app.use("/auth", authRoutes);

// Base route
app.get("/", (req, res) => {
  res.send("Welcome to eggless");
});

// Socket.IO logic
io.on("connection", (socket) => {
  console.log("🟢 New client connected:", socket.id);

  // Example: Receive event from client
  socket.on("message", (data) => {
    console.log("Received message:", data);
    // Broadcast message to all other clients
    socket.broadcast.emit("message", data);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("🔴 Client disconnected:", socket.id);
  });
});

// Start server
const port = process.env.PORT || 4000;
server.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});

// Connect to MongoDB
connectDB();
