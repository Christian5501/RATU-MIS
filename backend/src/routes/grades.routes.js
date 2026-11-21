const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function letterFor(score) {
  const n = Number(score);
  if (n >= 80) return 'A';
  if (n >= 70) return 'B';
  if (n >= 60) return 'C';
  if (n >= 50) return 'D';
  return 'F';
}

/** Downloads a template pre-filled with every student currently enrolled
 * in this course for the given semester -- registration number and name
 * already there, marks column left blank for the lecturer to fill in. */
router.get('/courses/:courseId/grades/template', requireAuth, requireRole('academic', 'admin'), async (req, res) => {
  const { courseId } = req.params;
  const { semester } = req.query;
  if (!semester) return res.status(400).json({ error: 'semester query parameter is required' });

  try {
    const [rows] = await pool.query(
      `SELECT u.registration_number, u.full_name
       FROM enrollments e
       JOIN users u ON u.id = e.student_id
       WHERE e.course_id = ? AND e.semester = ?
       ORDER BY u.registration_number`,
      [courseId, semester]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No students enrolled in this course for that semester' });
    }

    const sheetData = rows.map((r) => ({
      registration_number: r.registration_number,
      full_name: r.full_name,
      marks: '',
    }));
    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Marks');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="grades-template-${semester}.xlsx"`);
    res.send(buffer);
  } catch (err) {
    console.error('GET /grades/template error:', err.message);
    res.status(500).json({ error: 'Could not generate template' });
  }
});

/** Uploads a filled-in template. Every row is matched to a student by
 * registration number and to that student's enrollment in this specific
 * course/semester -- rows that can't be matched are reported back with
 * a specific reason rather than silently skipped, so a lecturer with a
 * typo in one row still gets every other row imported correctly. */
router.post('/courses/:courseId/grades/import', requireAuth, requireRole('academic', 'admin'), upload.single('file'), async (req, res) => {
  const { courseId } = req.params;
  const { semester } = req.body;
  if (!semester) return res.status(400).json({ error: 'semester is required' });
  if (!req.file) return res.status(400).json({ error: 'file is required' });

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

    let imported = 0;
    const failed = [];

    for (let i = 0; i < sheet.length; i++) {
      const row = sheet[i];
      const regNumber = row.registration_number;
      const marks = row.marks;
      const rowNum = i + 2; // account for header row, 1-indexed for humans

      if (!regNumber || marks === undefined || marks === '') {
        failed.push({ row: rowNum, registration_number: regNumber, reason: 'Missing registration number or marks' });
        continue;
      }

      const [students] = await pool.query('SELECT id FROM users WHERE registration_number = ? AND role = "student"', [regNumber]);
      if (students.length === 0) {
        failed.push({ row: rowNum, registration_number: regNumber, reason: 'No student with this registration number' });
        continue;
      }

      const [enrollments] = await pool.query(
        'SELECT id FROM enrollments WHERE student_id = ? AND course_id = ? AND semester = ?',
        [students[0].id, courseId, semester]
      );
      if (enrollments.length === 0) {
        failed.push({ row: rowNum, registration_number: regNumber, reason: 'Student is not enrolled in this course for this semester' });
        continue;
      }

      const score = Number(marks);
      const letter = letterFor(score);
      const enrollmentId = enrollments[0].id;

      await pool.query(
        `INSERT INTO grades (id, enrollment_id, score, letter, submitted_by, submitted_at)
         VALUES (?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE score = VALUES(score), letter = VALUES(letter), submitted_by = VALUES(submitted_by), submitted_at = NOW()`,
        [uuidv4(), enrollmentId, score, letter, req.user.id]
      );
      imported++;
    }

    res.json({ imported, failed });
  } catch (err) {
    console.error('POST /grades/import error:', err.message);
    res.status(500).json({ error: 'Could not process the uploaded file' });
  }
});

module.exports = router;
