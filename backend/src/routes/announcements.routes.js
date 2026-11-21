const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { notifyUser } = require('../sockets/index');

const router = express.Router();

/** Posts an announcement to a course and notifies every currently
 * enrolled student in real time -- targeted per-student (via each
 * student's own socket room) rather than broadcast to all students,
 * so someone in an unrelated course doesn't get a notification that
 * has nothing to do with them. */
router.post('/courses/:courseId/announcements', requireAuth, requireRole('academic', 'admin'), async (req, res) => {
  const { courseId } = req.params;
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'content is required' });
  }

  try {
    const [courseRows] = await pool.query('SELECT code, title FROM courses WHERE id = ?', [courseId]);
    if (courseRows.length === 0) return res.status(404).json({ error: 'Course not found' });
    const course = courseRows[0];

    const id = uuidv4();
    await pool.query(
      `INSERT INTO announcements (id, course_id, author_id, content) VALUES (?, ?, ?, ?)`,
      [id, courseId, req.user.id, content.trim()]
    );

    const [students] = await pool.query(
      `SELECT DISTINCT student_id FROM enrollments WHERE course_id = ? AND status = 'active'`,
      [courseId]
    );

    const io = req.app.get('io');
    if (io) {
      for (const s of students) {
        notifyUser(io, s.student_id, 'course:announcement-posted', {
          announcementId: id, courseId, courseCode: course.code, courseTitle: course.title,
          content: content.trim(), postedAt: new Date().toISOString(),
        });
      }
    }

    res.status(201).json({
      id, message: `Announcement posted and ${students.length} enrolled student${students.length === 1 ? '' : 's'} notified.`,
    });
  } catch (err) {
    console.error('POST /announcements error:', err.message);
    res.status(500).json({ error: 'Could not post announcement' });
  }
});

/** A student's personalized feed -- announcements from every course
 * they're actually enrolled in, newest first. */
router.get('/announcements/feed', requireAuth, requireRole('student'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.id, a.content, a.posted_at, c.code AS course_code, c.title AS course_title, u.full_name AS author
       FROM announcements a
       JOIN courses c ON c.id = a.course_id
       JOIN users u ON u.id = a.author_id
       JOIN enrollments e ON e.course_id = a.course_id AND e.student_id = ?
       ORDER BY a.posted_at DESC
       LIMIT 20`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /announcements/feed error:', err.message);
    res.status(500).json({ error: 'Could not fetch announcements' });
  }
});

/** All announcements for one course -- what a lecturer sees for their
 * own course, regardless of student enrollment. */
router.get('/courses/:courseId/announcements', requireAuth, requireRole('academic', 'admin', 'student'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.id, a.content, a.posted_at, u.full_name AS author
       FROM announcements a JOIN users u ON u.id = a.author_id
       WHERE a.course_id = ? ORDER BY a.posted_at DESC`,
      [req.params.courseId]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /courses/:courseId/announcements error:', err.message);
    res.status(500).json({ error: 'Could not fetch announcements' });
  }
});

module.exports = router;
