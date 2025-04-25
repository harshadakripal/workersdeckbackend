const express = require('express');
const cors = require('cors');
const app = express();
const bodyParser = require('body-parser');
require('dotenv').config();
app.use(express.json());

const db = require('./config/db');
const authRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/bookings');
const serviceRoutes = require('./routes/services');


app.use(cors({
  origin: "https://workersdeckfrontend.vercel.app", // Vercel frontend
  credentials: true
})); // Allow cross-origin for frontend
app.use(bodyParser.json());

// Routes
app.use('/api/services', serviceRoutes);   //  Get services
app.use('/api/auth', authRoutes);         //  Register/Login
app.use('/api/book', bookingRoutes);       //  Create booking
app.use('/api/services', serviceRoutes);
app.use("/api/bookings", require("./routes/bookings"));

// Test route
app.get('/', (req, res) => {
  res.send('Workers Deck API is running');
});

// Use port from .env or default 5000
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(` Server running on http://localhost:${PORT}`);
});