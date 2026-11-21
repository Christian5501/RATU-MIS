const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { notifyRole } = require('../sockets/index');

const router = express.Router();

/** Opens self-enrollment on a course for a fixed window (default 12
 * hours), and broadcasts to every connected student in real time --
 * this is the notification + countdown feature. */
router.post('/courses/:courseId/open-enrollment', requireAuth, requireRole('academic', 'admin'), async (req, res) => {
  const { courseId } = req.params;
  const { semester, hoursOpen } = req.body;
  if (!semester) return res.status(400).json({ error: 'semester is required' });

  const hours = Number(hoursOpen) > 0 ? Number(hoursOpen) : 12;

  try {
    await pool.query(
      `UPDATE courses SET enrollment_deadline = DATE_ADD(NOW(), INTERVAL ? HOUR), enrollment_semester = ? WHERE id = ?`,
      [hours, semester, courseId]
    );
    const [rows] = await pool.query('SELECT id, code, title, enrollment_deadline FROM courses WHERE id = ?', [courseId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Course not found' });

    const course = rows[0];
    const io = req.app.get('io');
    if (io) {
      notifyRole(io, 'student', 'course:enrollment-opened', {
        courseId: course.id, code: course.code, title: course.title,
        enrollment_deadline: course.enrollment_deadline, semester,
      });
    }

    res.json({ message: `Enrollment opened for ${hours} hour(s) and students notified.`, course });
  } catch (err) {
    console.error('POST /open-enrollment error:', err.message);
    res.status(500).json({ error: 'Could not open enrollment' });
  }
});

/** Self-enrollment -- only works while the deadline set above hasn't
 * passed. Once it has, a student is told exactly why and pointed to
 * administration rather than getting a generic error. */
router.post('/courses/:courseId/enroll', requireAuth, requireRole('student'), async (req, res) => {
  const { courseId } = req.params;

  try {
    const [rows] = await pool.query('SELECT id, enrollment_deadline, enrollment_semester FROM courses WHERE id = ?', [courseId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Course not found' });

    const course = rows[0];
    if (!course.enrollment_deadline || new Date(course.enrollment_deadline) < new Date()) {
      return res.status(403).json({
        error: 'Enrollment window closed',
        detail: 'The self-enrollment window for this course has closed. Contact your department administrator to be added.',
      });
    }

    const [existing] = await pool.query(
      'SELECT id FROM enrollments WHERE student_id = ? AND course_id = ? AND semester = ?',
      [req.user.id, courseId, course.enrollment_semester]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Already enrolled in this course for this semester' });
    }

    const id = uuidv4();
    await pool.query(
      'INSERT INTO enrollments (id, student_id, course_id, semester) VALUES (?, ?, ?, ?)',
      [id, req.user.id, courseId, course.enrollment_semester]
    );
    res.status(201).json({ id, course_id: courseId, semester: course.enrollment_semester });
  } catch (err) {
    console.error('POST /enroll error:', err.message);
    res.status(500).json({ error: 'Could not enroll in this course' });
  }
});

/** Courses currently open for self-enrollment -- what the student
 * dashboard polls to show the "Courses Open to Join" section. */
router.get('/courses/open', requireAuth, requireRole('student', 'academic', 'admin'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, code, title, enrollment_deadline, enrollment_semester
       FROM courses WHERE enrollment_deadline > NOW() ORDER BY enrollment_deadline`
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /courses/open error:', err.message);
    res.status(500).json({ error: 'Could not fetch open courses' });
  }
});

module.exports = router;
