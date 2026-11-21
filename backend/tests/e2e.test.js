const axios = require('axios');
const XLSX = require('xlsx');

const API = 'http://localhost:4000/api';
let pass = 0, fail = 0;

function check(label, condition, detail = '') {
  if (condition) { console.log(`  [PASS] ${label}`); pass++; }
  else { console.log(`  [FAIL] ${label} ${detail}`); fail++; }
}

async function register(email, role, extra = {}) {
  const { data } = await axios.post(`${API}/auth/register`, {
    email, password: 'Test123!', fullName: email.split('@')[0], role, ...extra,
  });
  return data;
}

async function main() {
  console.log('=== Setup: register academic + 3 students ===');
  const academic = await register('lecturer.e2e@ratu.edu.rw', 'academic');
  const s1 = await register('s1.e2e@ratu.edu.rw', 'student', { registrationNumber: 'RATU/2026/E01' });
  const s2 = await register('s2.e2e@ratu.edu.rw', 'student', { registrationNumber: 'RATU/2026/E02' });
  const s3 = await register('s3.e2e@ratu.edu.rw', 'student', { registrationNumber: 'RATU/2026/E03' });
  check('academic registered', !!academic.token);
  check('3 students registered', !!(s1.token && s2.token && s3.token));

  const academicHeaders = { Authorization: `Bearer ${academic.token}` };
  const s1Headers = { Authorization: `Bearer ${s1.token}` };
  const s2Headers = { Authorization: `Bearer ${s2.token}` };
  const s3Headers = { Authorization: `Bearer ${s3.token}` };

  console.log('\n=== Create course ===');
  const courseResp = await axios.post(`${API}/academic/courses`,
    { code: 'NET301-E2E', title: 'Enterprise Network Design', department: 'Networking', credits: 4 },
    { headers: academicHeaders });
  const courseId = courseResp.data.id;
  check('course created', !!courseId);

  console.log('\n=== Open enrollment for 1 hour ===');
  const openResp = await axios.post(`${API}/academic/courses/${courseId}/open-enrollment`,
    { semester: '2026-S1', hoursOpen: 1 }, { headers: academicHeaders });
  check('enrollment opened', openResp.status === 200);
  check('deadline set ~1hr out', new Date(openResp.data.course.enrollment_deadline) - new Date() > 55 * 60 * 1000);

  console.log('\n=== Students 1 & 2 self-enroll ===');
  const enroll1 = await axios.post(`${API}/academic/courses/${courseId}/enroll`, {}, { headers: s1Headers });
  const enroll2 = await axios.post(`${API}/academic/courses/${courseId}/enroll`, {}, { headers: s2Headers });
  check('student 1 enrolled', enroll1.status === 201);
  check('student 2 enrolled', enroll2.status === 201);

  console.log('\n=== Duplicate enroll attempt is rejected ===');
  try {
    await axios.post(`${API}/academic/courses/${courseId}/enroll`, {}, { headers: s1Headers });
    check('duplicate enroll blocked', false, '(request succeeded, should have failed)');
  } catch (err) {
    check('duplicate enroll blocked', err.response?.status === 409);
  }

  console.log('\n=== Second course with an already-expired window ===');
  const course2Resp = await axios.post(`${API}/academic/courses`,
    { code: 'NET302-E2E', title: 'Wireless Systems', department: 'Networking', credits: 3 },
    { headers: academicHeaders });
  const course2Id = course2Resp.data.id;
  await axios.post(`${API}/academic/courses/${course2Id}/open-enrollment`,
    { semester: '2026-S1', hoursOpen: 1 }, { headers: academicHeaders });

  const mysql = require('mysql2/promise');
  const db = await mysql.createConnection({ host: 'localhost', user: 'root', password: '', database: 'ratu_mis' });
  await db.query('UPDATE courses SET enrollment_deadline = DATE_SUB(NOW(), INTERVAL 1 HOUR) WHERE id = ?', [course2Id]);

  console.log('=== Student 3 tries to join AFTER the deadline ===');
  try {
    await axios.post(`${API}/academic/courses/${course2Id}/enroll`, {}, { headers: s3Headers });
    check('expired window blocks join', false, '(request succeeded, should have failed)');
  } catch (err) {
    check('expired window blocks join', err.response?.status === 403);
    check('error tells student to contact admin', /administrator/i.test(err.response?.data?.detail || ''));
  }

  console.log('\n=== Enroll student 3 in course 1 directly (setup for grade test) ===');
  const { v4: uuidv4 } = require('uuid');
  await db.query(
    `INSERT INTO enrollments (id, student_id, course_id, semester) VALUES (?, ?, ?, ?)`,
    [uuidv4(), s3.user.id, courseId, '2026-S1']
  );

  console.log('\n=== Download the grade template ===');
  const templateResp = await axios.get(`${API}/academic/courses/${courseId}/grades/template`, {
    params: { semester: '2026-S1' }, headers: academicHeaders, responseType: 'arraybuffer',
  });
  const workbook = XLSX.read(templateResp.data, { type: 'buffer' });
  const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
  check('template has 3 rows (3 enrolled students)', sheet.length === 3, `(got ${sheet.length})`);
  check('template rows have registration_number + blank marks',
    sheet.every((r) => r.registration_number && r.marks === ''));

  console.log('\n=== Fill in marks: 2 valid, 1 deliberately broken registration number ===');
  const filledRows = sheet.map((row) => {
    if (row.registration_number === 'RATU/2026/E01') return { ...row, marks: 88 };
    if (row.registration_number === 'RATU/2026/E02') return { ...row, marks: 71 };
    return { ...row, registration_number: 'TYPO/NOT/REAL', marks: 60 };
  });
  const newSheet = XLSX.utils.json_to_sheet(filledRows);
  const newWorkbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(newWorkbook, newSheet, 'Marks');
  const filledBuffer = XLSX.write(newWorkbook, { type: 'buffer', bookType: 'xlsx' });

  console.log('\n=== Upload the filled template ===');
  const FormData = require('form-data');
  const formData = new FormData();
  formData.append('semester', '2026-S1');
  formData.append('file', filledBuffer, { filename: 'grades.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  const importResp = await axios.post(`${API}/academic/courses/${courseId}/grades/import`, formData, {
    headers: { ...academicHeaders, ...formData.getHeaders() },
  });

  check('2 rows imported successfully', importResp.data.imported === 2, `(got ${importResp.data.imported})`);
  check('1 row correctly reported as failed', importResp.data.failed.length === 1, `(got ${importResp.data.failed.length})`);
  check('failure reason is about the bad registration number',
    importResp.data.failed[0]?.reason?.includes('No student with this registration number'));

  console.log('\n=== Verify grades landed correctly ===');
  const check1 = await axios.get(`${API}/academic/enrollments/${s1.user.id}`, { headers: s1Headers });
  const check2 = await axios.get(`${API}/academic/enrollments/${s2.user.id}`, { headers: s2Headers });
  const netCourse1 = check1.data.find((e) => e.code === 'NET301-E2E');
  const netCourse2 = check2.data.find((e) => e.code === 'NET301-E2E');
  check('student 1 grade = 88, letter A', String(netCourse1?.score) === '88.00' && netCourse1?.letter === 'A',
    `(got score=${netCourse1?.score} letter=${netCourse1?.letter})`);
  check('student 2 grade = 71, letter B', String(netCourse2?.score) === '71.00' && netCourse2?.letter === 'B',
    `(got score=${netCourse2?.score} letter=${netCourse2?.letter})`);

  console.log('\n=== Announcements: post, verify targeted feed, verify RBAC ===');
  const annResp = await axios.post(`${API}/academic/courses/${courseId}/announcements`,
    { content: 'Midterm moved to next Friday.' }, { headers: academicHeaders });
  check('announcement posted', annResp.status === 201);
  check('response confirms 3 students notified (all currently enrolled)', annResp.data.message.includes('3 enrolled'),
    `(got: "${annResp.data.message}")`);

  const feed1 = await axios.get(`${API}/academic/announcements/feed`, { headers: s1Headers });
  check('enrolled student sees the announcement in their feed',
    feed1.data.some((a) => a.content === 'Midterm moved to next Friday.' && a.course_code === 'NET301-E2E'));

  // s3 was manually inserted into course 1 but never enrolled in the
  // *second* course -- confirms the feed only shows courses actually
  // joined, not every announcement in the system.
  const feedS3 = await axios.get(`${API}/academic/announcements/feed`, { headers: s3Headers });
  check('feed only includes announcements from courses the student is actually enrolled in',
    feedS3.data.every((a) => a.course_code === 'NET301-E2E'));

  try {
    await axios.post(`${API}/academic/courses/${courseId}/announcements`,
      { content: 'Should be blocked' }, { headers: s1Headers });
    check('student blocked from posting announcements', false, '(request succeeded, should have failed)');
  } catch (err) {
    check('student blocked from posting announcements', err.response?.status === 403);
  }

  console.log('\n=== Cross-check: finance role cannot touch grades (RBAC still holds) ===');
  const financeUser = await register('finance.e2e@ratu.edu.rw', 'finance');
  try {
    await axios.post(`${API}/academic/courses/${courseId}/open-enrollment`,
      { semester: '2026-S1', hoursOpen: 1 }, { headers: { Authorization: `Bearer ${financeUser.token}` } });
    check('finance blocked from opening enrollment', false, '(request succeeded, should have failed)');
  } catch (err) {
    check('finance blocked from opening enrollment', err.response?.status === 403);
  }

  await db.end();
  console.log(`\n=== RESULTS: ${pass} passed, ${fail} failed ===`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('TEST SCRIPT CRASHED:', err.response?.data || err.message);
  process.exit(1);
});
