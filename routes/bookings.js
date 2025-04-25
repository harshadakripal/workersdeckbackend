const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');
const authenticateToken = require("../middleware/authMiddleware");


// POST /api/book - Book a service (Protected)
router.post('/', authMiddleware, async (req, res) => {
  const { service_id, booking_date, booking_time, address } = req.body;

  if (!service_id || !booking_date || !booking_time || !address) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    await db.query(
      `INSERT INTO bookings (user_id, service_id, booking_date, booking_time, address)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, service_id, booking_date, booking_time, address]
    );

    res.json({ message: `✅ Booking confirmed for ${booking_date} at ${booking_time}` });
  } catch (err) {
    console.error('Booking error:', err);
    res.status(500).json({ error: 'Booking failed. Try again later.' });
  }
});

// DELETE /api/bookings/:id
router.delete("/:id", authenticateToken, async (req, res) => {
  const bookingId = req.params.id;
  const userId = req.user.id;

  try {
    // Only allow user to delete their own bookings
    const [result] = await db.query("DELETE FROM bookings WHERE id = ? AND user_id = ?", [bookingId, userId]);

    if (result.affectedRows === 0) {
      return res.status(403).json({ message: "Unauthorized or booking not found" });
    }

    res.json({ message: "Booking cancelled successfully" });
  } catch (err) {
    console.error("Error cancelling booking:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// GET all users (admin only)
router.get("/admin/users", authenticateToken, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Access denied" });
  const [rows] = await db.query("SELECT id, name, email, role FROM users");
  res.json(rows);
});

// GET all bookings with user info (admin only)
router.get("/admin/bookings", authenticateToken, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Access denied" });
  try{
  const [rows] = await db.query(`
    SELECT 
      b.id AS booking_id,
      b.booking_date,
      b.booking_time,
      b.address,
      b.status,
      w.name AS worker_name,
      u.name AS user_name,
      s.name AS service_name
    FROM bookings b
    JOIN users u ON b.user_id = u.id
    JOIN services s ON b.service_id = s.id
    LEFT JOIN users w ON b.worker_id = w.id
    ORDER BY b.booking_date DESC
  `);

  res.json(rows);
} catch(err) {
  console.error("❌ Error fetching admin bookings:", err);
  res.status(500).json({ error: "Server error" });
}
});

// GET all services (admin only)
router.get("/admin/services", authenticateToken, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Access denied" });

  const [rows] = await db.query("SELECT * FROM services");
  res.json(rows);
});

// DELETE user by ID (admin only)
router.delete("/admin/users/:id", authenticateToken, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Access denied" });

  const [result] = await db.query("DELETE FROM users WHERE id = ?", [req.params.id]);
  if (result.affectedRows === 0) return res.status(404).json({ message: "User not found" });
  res.json({ message: "User deleted successfully" });
});

// DELETE service by ID (admin only)
router.delete("/admin/services/:id", authenticateToken, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Access denied" });

  const [result] = await db.query("DELETE FROM services WHERE id = ?", [req.params.id]);
  if (result.affectedRows === 0) return res.status(404).json({ message: "Service not found" });
  res.json({ message: "Service deleted successfully" });
});

// UPDATE service (edit)
router.put("/admin/services/:id", authenticateToken, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Access denied" });

  const { name, description, price } = req.body;
  const [result] = await db.query(
    "UPDATE services SET name = ?, description = ?, price = ? WHERE id = ?",
    [name, description, price, req.params.id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ message: "Service not found" });
  res.json({ message: "Service updated successfully" });
});

router.post("/admin/services", authenticateToken, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Access denied" });

  const { name, description, price } = req.body;
  if (!name || !price) {
    return res.status(400).json({ message: "Name and price are required" });
  }

  try {
    const [result] = await db.query(
      "INSERT INTO services (name, description, price) VALUES (?, ?, ?)",
      [name, description, price]
    );
    res.status(201).json({ message: "Service added successfully", id: result.insertId });
  } catch (err) {
    console.error("Error adding service:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/bookings/worker/my-bookings
router.get("/worker/my-bookings", authenticateToken, async (req, res) => {
  if (req.user.role !== "worker") {
    return res.status(403).json({ message: "Access denied" });
  }

  const [rows] = await db.query(
    `SELECT b.id, b.booking_date, b.booking_time, b.address, b.status,
            u.name AS customer_name, s.name AS service_name
     FROM bookings b
     JOIN users u ON b.user_id = u.id
     JOIN services s ON b.service_id = s.id
     WHERE b.worker_id = ?`,
    [req.user.id]
  );

  res.json(rows);
});

// PUT /api/bookings/worker/update-status/:id
router.put("/worker/update-status/:id", authenticateToken, async (req, res) => {
  if (req.user.role !== "worker") {
    return res.status(403).json({ message: "Access denied" });
  }

  const { status } = req.body;
  const allowed = ["Pending", "In Progress", "Completed"];

  if (!allowed.includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  await db.query(
    "UPDATE bookings SET status = ? WHERE id = ? AND worker_id = ?",
    [status, req.params.id, req.user.id]
  );

  res.json({ message: "Status updated successfully" });
});

// PUT /bookings/admin/assign-worker/:bookingId
router.put('/admin/assign-worker/:bookingId', authMiddleware, async (req, res) => {
  const { worker_id } = req.body;
  const { bookingId } = req.params;

  try {
    await db.query("UPDATE bookings SET worker_id = ? WHERE id = ?", [worker_id, bookingId]);
    res.json({ message: "Worker assigned successfully." });
  } catch (err) {
    console.error("Assignment failed", err);
    res.status(500).json({ error: "Failed to assign worker." });
  }
});

// Assign a worker to a booking
router.put('/admin/assign-worker/:bookingId', authenticateToken, async (req, res) => {
  const { bookingId } = req.params;
  const { worker_id } = req.body;

  try {
    await db.query(
      'UPDATE bookings SET worker_id = ? WHERE id = ?',
      [worker_id, bookingId]
    );

    res.json({ message: 'Worker assigned successfully' });
  } catch (err) {
    console.error('Error assigning worker:', err);
    res.status(500).json({ error: 'Failed to assign worker' });
  }
});


module.exports = router;