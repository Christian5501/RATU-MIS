const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = express.Router();

router.get('/courses', requireAuth, requireRole('student', 'academic', 'admin'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.id, c.code, c.title, c.department, c.credits,
              c.enrollment_deadline, c.enrollment_semester,
              u.full_name AS lecturer
       FROM courses c
       LEFT JOIN users u ON u.id = c.lecturer_id
       ORDER BY c.code`
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /courses error:', err.message);
    res.status(500).json({ error: 'Could not fetch courses' });
  }
});

router.post('/courses', requireAuth, requireRole('academic', 'admin'), async (req, res) => {
  const { code, title, department, credits } = req.body;
  if (!code || !title) {
    return res.status(400).json({ error: 'code and title are required' });
  }
  try {
    const id = uuidv4();
    const lecturerId = req.user.role === 'academic' ? req.user.id : null;
    await pool.query(
      `INSERT INTO courses (id, code, title, department, credits, lecturer_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, code, title, department || null, credits || 3, lecturerId]
    );
    res.status(201).json({ id, code, title, department, credits: credits || 3, lecturer_id: lecturerId });
  } catch (err) {
    console.error('POST /courses error:', err.message);
    res.status(500).json({ error: 'Could not create course' });
  }
});

router.get('/enrollments/:studentId', requireAuth, requireRole('student', 'academic', 'admin'), async (req, res) => {
  const { studentId } = req.params;
  if (req.user.role === 'student' && req.user.id !== studentId) {
    return res.status(403).json({ error: 'Students may only view their own enrollments' });
  }
  try {
    const [rows] = await pool.query(
      `SELECT e.id, e.semester, e.status, c.code, c.title, g.score, g.letter
       FROM enrollments e
       JOIN courses c ON c.id = e.course_id
       LEFT JOIN grades g ON g.enrollment_id = e.id
       WHERE e.student_id = ?
       ORDER BY e.semester DESC`,
      [studentId]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /enrollments error:', err.message);
    res.status(500).json({ error: 'Could not fetch enrollments' });
  }
});

module.exports = router;
