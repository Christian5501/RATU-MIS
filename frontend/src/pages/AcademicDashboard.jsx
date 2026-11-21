import React, { useEffect, useState } from 'react';
import axios from 'axios';
import DashboardShell from '../components/DashboardShell';
import { Section, Empty, Table, Badge, formatDate } from '../components/Table';

const inputCls = "rounded-md border border-line px-3 py-2 text-[13px] text-ink bg-white focus:outline-none focus:ring-2 focus:ring-ink/20 focus:border-ink/30 transition";
const cardCls = "bg-white border border-line rounded-lg p-4";
const primaryBtn = "bg-role-academic text-white text-[13px] font-medium rounded-md px-4 py-2 hover:opacity-90 transition disabled:opacity-50";

export default function AcademicDashboard() {
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState({ code: '', title: '', department: '', credits: 3 });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function loadCourses() {
    axios.get('/api/academic/courses').then((res) => setCourses(res.data)).catch(() => setError('Could not load courses'));
  }

  useEffect(() => {
    let ignore = false;
    axios.get('/api/academic/courses')
      .then((res) => { if (!ignore) setCourses(res.data); })
      .catch(() => { if (!ignore) setError('Could not load courses'); });
    return () => { ignore = true; };
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await axios.post('/api/academic/courses', form);
      setForm({ code: '', title: '', department: '', credits: 3 });
      loadCourses();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create course');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardShell role="academic">
      {error && <p className="text-[13px] text-red-600 mb-4">{error}</p>}

      <Section title="Add a Course">
        <form onSubmit={handleCreate} className={`grid grid-cols-2 md:grid-cols-5 gap-3 ${cardCls}`}>
          <input required placeholder="Code (e.g. NET301)" value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })} className={`col-span-1 font-mono ${inputCls}`} />
          <input required placeholder="Title" value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })} className={`col-span-2 ${inputCls}`} />
          <input placeholder="Department" value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })} className={`col-span-1 ${inputCls}`} />
          <button type="submit" disabled={submitting} className={`col-span-1 ${primaryBtn}`}>
            {submitting ? 'Adding…' : 'Add course'}
          </button>
        </form>
      </Section>

      <OpenEnrollmentSection courses={courses} onDone={loadCourses} />
      <GradesSection courses={courses} />
      <AnnouncementsSection courses={courses} />

      <Section title="All Courses">
        {courses.length === 0 ? <Empty text="No courses yet — add the first one above" /> : (
          <Table headers={['Code', 'Title', 'Department', 'Credits', 'Lecturer', 'Enrollment']} monoCols={[0, 3]}
            rows={courses.map((c) => [
              c.code, c.title, c.department || '—', c.credits, c.lecturer || '—',
              c.enrollment_deadline && new Date(c.enrollment_deadline) > new Date()
                ? <Badge tone="positive">Open until {formatDate(c.enrollment_deadline)}</Badge> : '—',
            ])} />
        )}
      </Section>
    </DashboardShell>
  );
}

function OpenEnrollmentSection({ courses, onDone }) {
  const [courseId, setCourseId] = useState('');
  const [semester, setSemester] = useState('');
  const [hours, setHours] = useState(12);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      const { data } = await axios.post(`/api/academic/courses/${courseId}/open-enrollment`, { semester, hoursOpen: Number(hours) });
      setMessage(data.message);
      onDone();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not open enrollment');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Section title="Open Enrollment for a Course" eyebrow="Notifies students instantly">
      <form onSubmit={handleSubmit} className={`grid grid-cols-2 md:grid-cols-4 gap-3 ${cardCls}`}>
        <select required value={courseId} onChange={(e) => setCourseId(e.target.value)} className={`col-span-2 ${inputCls}`}>
          <option value="">Select a course…</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}
        </select>
        <input required placeholder="Semester (e.g. 2026-S1)" value={semester}
          onChange={(e) => setSemester(e.target.value)} className={`font-mono ${inputCls}`} />
        <input required type="number" min="1" placeholder="Hours open" value={hours}
          onChange={(e) => setHours(e.target.value)} className={`font-mono ${inputCls}`} />
        <button type="submit" disabled={submitting} className={`col-span-2 md:col-span-4 ${primaryBtn}`}>
          {submitting ? 'Opening…' : 'Open enrollment & notify students'}
        </button>
      </form>
      {message && <p className="text-[13px] text-role-student mt-2">{message}</p>}
      {error && <p className="text-[13px] text-red-600 mt-2">{error}</p>}
    </Section>
  );
}

function GradesSection({ courses }) {
  const [courseId, setCourseId] = useState('');
  const [semester, setSemester] = useState('');
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function handleDownload() {
    if (!courseId || !semester) { setError('Select a course and enter a semester first'); return; }
    setDownloading(true);
    setError('');
    try {
      const res = await axios.get(`/api/academic/courses/${courseId}/grades/template`, { params: { semester }, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `grades-template-${semester}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Could not generate template — is anyone enrolled in this course for that semester?');
    } finally {
      setDownloading(false);
    }
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!courseId || !semester || !file) { setError('Select a course, semester, and a filled-in file first'); return; }
    setUploading(true);
    setError('');
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('semester', semester);
      formData.append('file', file);
      const { data } = await axios.post(`/api/academic/courses/${courseId}/grades/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not import grades');
    } finally {
      setUploading(false);
    }
  }

  return (
    <Section title="Upload Grades from Excel" eyebrow="Bulk grade entry">
      <div className={`space-y-4 ${cardCls}`}>
        <div className="grid grid-cols-2 gap-3">
          <select required value={courseId} onChange={(e) => setCourseId(e.target.value)} className={inputCls}>
            <option value="">Select a course…</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}
          </select>
          <input required placeholder="Semester (e.g. 2026-S1)" value={semester}
            onChange={(e) => setSemester(e.target.value)} className={`font-mono ${inputCls}`} />
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={handleDownload} disabled={downloading}
            className="text-[13px] font-medium text-role-academic hover:underline disabled:opacity-60">
            {downloading ? 'Preparing…' : '↓ Download template for enrolled students'}
          </button>
        </div>
        <form onSubmit={handleUpload} className="flex items-center gap-3 pt-3 border-t border-line">
          <input type="file" accept=".xlsx" onChange={(e) => setFile(e.target.files[0])} className="text-[13px] flex-1 text-ink/70" />
          <button type="submit" disabled={uploading} className={`whitespace-nowrap ${primaryBtn}`}>
            {uploading ? 'Uploading…' : 'Upload filled template'}
          </button>
        </form>
        {error && <p className="text-[13px] text-red-600">{error}</p>}
        {result && (
          <div className="pt-3 border-t border-line">
            <p className="text-[13px] font-medium text-role-student mb-2">
              {result.imported} grade{result.imported === 1 ? '' : 's'} imported successfully
            </p>
            {result.failed.length > 0 && (
              <div>
                <p className="text-[13px] font-medium text-role-finance mb-1">{result.failed.length} row(s) need attention:</p>
                <ul className="text-[12px] text-ink/60 space-y-1 font-mono">
                  {result.failed.map((f, i) => <li key={i}>Row {f.row}{f.registration_number ? ` (${f.registration_number})` : ''}: {f.reason}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Section>
  );
}

function AnnouncementsSection({ courses }) {
  const [courseId, setCourseId] = useState('');
  const [content, setContent] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      const { data } = await axios.post(`/api/academic/courses/${courseId}/announcements`, { content });
      setMessage(data.message);
      setContent('');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not post announcement');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Section title="Post an Announcement" eyebrow="Notifies enrolled students instantly">
      <form onSubmit={handleSubmit} className={`space-y-3 ${cardCls}`}>
        <select required value={courseId} onChange={(e) => setCourseId(e.target.value)} className={`w-full ${inputCls}`}>
          <option value="">Select a course…</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}
        </select>
        <textarea required rows={3} placeholder="Write your announcement…" value={content}
          onChange={(e) => setContent(e.target.value)} className={`w-full resize-none ${inputCls}`} />
        <button type="submit" disabled={submitting} className={primaryBtn}>
          {submitting ? 'Posting…' : 'Post & notify enrolled students'}
        </button>
      </form>
      {message && <p className="text-[13px] text-role-student mt-2">{message}</p>}
      {error && <p className="text-[13px] text-red-600 mt-2">{error}</p>}
    </Section>
  );
}
