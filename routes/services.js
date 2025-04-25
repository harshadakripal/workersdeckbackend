const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Existing route: Get all services
router.get('/', async (req, res) => {
  try {
    const [services] = await db.query('SELECT * FROM services');
    res.json(services);
  } catch (err) {
    console.error("Error fetching services:", err);
    res.status(500).json({ error: "Failed to fetch services" });
  }
});

// ✅ NEW route: Get service by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query('SELECT * FROM services WHERE id = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Service not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Error fetching service:", err);
    res.status(500).json({ error: "Failed to fetch service" });
  }
});

module.exports = router;
