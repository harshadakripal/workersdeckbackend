const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authMiddleware = require("../middleware/authMiddleware");
const Email  = require('../mailtrap-test');
require('dotenv').config();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password, phone, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'All fields including role are required' });
  }

  try {
    const [existing] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      'INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashedPassword, phone, role]
    );

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '1d'
    });

    res.json({ message: 'Login successful', token, user: { id: user.id, name: user.name, role: user.role } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});
 
//forgot-password route
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  console.log("🔥 Forgot Password API Hit");

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      console.log("⚠️ No user found for email:", email);
      return res.status(200).json({ message: "If an account with that email exists, a reset link has been sent." });
    }

    const user = rows[0];
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const resetLink = `${process.env.BASE_URL}/reset-password?token=${token}`;
    console.log("🔗 Reset link:", resetLink);
    console.log(user);
    const html= `
    <p>Hello, ${user.name || "user"}</p>
    <p>You requested a password reset. Click the link below:</p>
    <a href="${resetLink}">${resetLink}</a>
    <p>If you didn’t request this, ignore this email.</p>
  `
    Email.sendEmail(user.email,"this is testing", html);
    res.json({ message: "✅ Reset email sent"});
  } catch (err) {
    console.error("❌ Forgot-password error:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

// RESET PASSWORD - Update password in MySQL
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ error: "Token and new password are required." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const userId = payload.id;

    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found. Token may be invalid." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);

    res.json({ message: "Password has been reset successfully. You can now log in with your new password." });
  } catch (err) {
    console.error("Error in reset-password:", err);
    res.status(500).json({ error: "Server error. Please try again." });
  }
});

// GET /api/auth/me - Get logged-in user info (Protected route)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, name, email, phone, role FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    //  Updated query to include worker_name and status
    const [bookings] = await db.query(
      `SELECT 
         b.id, 
         b.booking_date, 
         b.booking_time, 
         b.address, 
         s.name AS service_name,
         b.status,
         u.name AS worker_name
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       LEFT JOIN users u ON b.worker_id = u.id
       WHERE b.user_id = ?`,
      [req.user.id]
    );

    res.json({ user: users[0], bookings });
  } catch (err) {
    console.error('Error in /me route:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


// GET /api/services/:id - Fetch single service
router.get('/:id', async (req, res) => {
  try {
    const [services] = await db.query('SELECT * FROM services WHERE id = ?', [req.params.id]);

    if (services.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json(services[0]);
  } catch (err) {
    console.error('Error fetching service:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
