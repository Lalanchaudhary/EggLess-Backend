const express = require("express");
const app = express();
const connectDB = require("./config/database");
const cors = require("cors");
app.use(cors());
require("dotenv").config();
console.log('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID);
console.log('RAZORPAY_KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET);
const cokkieParser = require("cookie-parser");

app.use(cokkieParser());

app.use(express.json());
const userRoutes = require("./routes/userRoutes");
const paymentRoutes=require("./routes/paymentRoutes")
const cakeRoutes=require("./routes/cakeRoutes")
const adminRoutes=require("./routes/adminRoutes")
const authRoutes=require("./routes/authRoutes")
const port = process.env.PORT || 4000;

app.use("/users", userRoutes);
app.use("/payment",paymentRoutes);
app.use("/cake",cakeRoutes);
app.use("/admin",adminRoutes);
app.use("/auth",authRoutes);
app.get("/",(req,res)=>{
res.send("Welcome to eggless")
})
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

connectDB();
