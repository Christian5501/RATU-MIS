const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = express.Router();

router.get('/invoices', requireAuth, requireRole('finance', 'admin', 'student'), async (req, res) => {
  try {
    const isStudent = req.user.role === 'student';
    const query = isStudent
      ? `SELECT id, amount, description, status, due_date, paid_at FROM invoices WHERE student_id = ? ORDER BY due_date`
      : `SELECT i.id, u.full_name AS student, i.amount, i.description, i.status, i.due_date, i.paid_at
         FROM invoices i JOIN users u ON u.id = i.student_id ORDER BY i.due_date`;
    const params = isStudent ? [req.user.id] : [];
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('GET /invoices error:', err.message);
    res.status(500).json({ error: 'Could not fetch invoices' });
  }
});

router.post('/invoices', requireAuth, requireRole('finance', 'admin'), async (req, res) => {
  const { studentId, amount, description, dueDate } = req.body;
  if (!studentId || !amount) {
    return res.status(400).json({ error: 'studentId and amount are required' });
  }
  try {
    const id = uuidv4();
    await pool.query(
      `INSERT INTO invoices (id, student_id, amount, description, due_date) VALUES (?, ?, ?, ?, ?)`,
      [id, studentId, amount, description || null, dueDate || null]
    );
    res.status(201).json({ id, student_id: studentId, amount, description, due_date: dueDate, status: 'unpaid' });
  } catch (err) {
    console.error('POST /invoices error:', err.message);
    res.status(500).json({ error: 'Could not create invoice' });
  }
});

router.patch('/invoices/:id/pay', requireAuth, requireRole('finance', 'admin'), async (req, res) => {
  try {
    const [result] = await pool.query(`UPDATE invoices SET status = 'paid', paid_at = NOW() WHERE id = ?`, [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Invoice not found' });
    const [rows] = await pool.query(`SELECT * FROM invoices WHERE id = ?`, [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('PATCH /invoices/pay error:', err.message);
    res.status(500).json({ error: 'Could not update invoice' });
  }
});

module.exports = router;
