const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = express.Router();

router.get('/admissions', requireAuth, requireRole('admin', 'academic'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, applicant_name, applicant_email, program, status, submitted_at
       FROM admissions ORDER BY submitted_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /admissions error:', err.message);
    res.status(500).json({ error: 'Could not fetch admissions' });
  }
});

router.post('/admissions', requireAuth, requireRole('admin'), async (req, res) => {
  const { applicantName, applicantEmail, program } = req.body;
  if (!applicantName || !applicantEmail || !program) {
    return res.status(400).json({ error: 'applicantName, applicantEmail, and program are required' });
  }
  try {
    const id = uuidv4();
    await pool.query(
      `INSERT INTO admissions (id, applicant_name, applicant_email, program) VALUES (?, ?, ?, ?)`,
      [id, applicantName, applicantEmail, program]
    );
    res.status(201).json({ id, applicant_name: applicantName, applicant_email: applicantEmail, program, status: 'pending' });
  } catch (err) {
    console.error('POST /admissions error:', err.message);
    res.status(500).json({ error: 'Could not create admission record' });
  }
});

router.patch('/admissions/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { status } = req.body;
  if (!['pending', 'accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'status must be pending, accepted, or rejected' });
  }
  try {
    const [result] = await pool.query(
      `UPDATE admissions SET status = ?, reviewed_by = ? WHERE id = ?`,
      [status, req.user.id, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Admission record not found' });
    const [rows] = await pool.query(`SELECT * FROM admissions WHERE id = ?`, [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('PATCH /admissions error:', err.message);
    res.status(500).json({ error: 'Could not update admission record' });
  }
});

module.exports = router;
