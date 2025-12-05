const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'https://workersdeckfrontend.vercel.app',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// Middleware
app.use(express.json());
app.use(bodyParser.json());

// Database connection
const db = require('./config/db');

// Routes
const authRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/bookings');
const serviceRoutes = require('./routes/services');

app.use('/api/auth', authRoutes);         // Register/Login
app.use('/api/bookings', bookingRoutes);      // Create booking
app.use('/api/book', bookingRoutes);
app.use('/api/services', serviceRoutes);  // Get services

// Test route
app.get('/', (req, res) => {
  res.send('Workers Deck API is running');
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port:${PORT}`);
});
