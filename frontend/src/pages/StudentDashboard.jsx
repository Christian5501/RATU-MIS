import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import DashboardShell from '../components/DashboardShell';
import { Section, Empty, Table, Badge, formatDate } from '../components/Table';
import CountdownTimer from '../components/CountdownTimer';

async function fetchData(userId) {
  const [enr, inv, open, ann] = await Promise.all([
    axios.get(`/api/academic/enrollments/${userId}`),
    axios.get('/api/finance/invoices'),
    axios.get('/api/academic/courses/open'),
    axios.get('/api/academic/announcements/feed'),
  ]);
  return { enrollments: enr.data, invoices: inv.data, openCourses: open.data, announcements: ann.data };
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [openCourses, setOpenCourses] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(null);

  function reload() {
    fetchData(user.id)
      .then((d) => { setEnrollments(d.enrollments); setInvoices(d.invoices); setOpenCourses(d.openCourses); setAnnouncements(d.announcements); })
      .catch(() => setError('Could not load your records'));
  }

  useEffect(() => {
    let ignore = false;
    fetchData(user.id)
      .then((d) => {
        if (ignore) return;
        setEnrollments(d.enrollments);
        setInvoices(d.invoices);
        setOpenCourses(d.openCourses);
        setAnnouncements(d.announcements);
      })
      .catch(() => { if (!ignore) setError('Could not load your records'); });
    return () => { ignore = true; };
  }, [user.id]);

  // Live-refresh the feed the instant a new announcement notification
  // arrives, rather than waiting for the next full page load.
  const { notifications } = useSocket();
  useEffect(() => {
    if (notifications.some((n) => n.type === 'announcement')) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications.length]);

  async function handleJoin(courseId) {
    setJoining(courseId);
    setError('');
    try {
      await axios.post(`/api/academic/courses/${courseId}/enroll`);
      reload();
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.error || 'Could not join this course');
    } finally {
      setJoining(null);
    }
  }

  return (
    <DashboardShell role="student">
      {error && <p className="text-[13px] text-red-600 mb-4">{error}</p>}

      {openCourses.length > 0 && (
        <Section title="Courses Open to Join" eyebrow="Action needed">
          <div className="space-y-2">
            {openCourses.map((c) => (
              <div key={c.id} className="flex items-center justify-between bg-white border border-line rounded-lg px-4 py-3">
                <div>
                  <p className="text-[14px] font-medium text-ink">{c.code} — {c.title}</p>
                  <CountdownTimer deadline={c.enrollment_deadline} onExpire={reload} />
                </div>
                <button onClick={() => handleJoin(c.id)} disabled={joining === c.id}
                  className="text-[13px] font-medium bg-role-student text-white rounded-md px-3.5 py-1.5 hover:opacity-90 transition disabled:opacity-50">
                  {joining === c.id ? 'Joining…' : 'Join'}
                </button>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="My Courses">
        {enrollments.length === 0 ? <Empty text="Not enrolled in any courses yet" /> : (
          <Table headers={['Code', 'Title', 'Semester', 'Score', 'Grade']} monoCols={[0, 3]}
            rows={enrollments.map((e) => [
              e.code, e.title, e.semester,
              e.score != null ? Number(e.score).toFixed(0) : '—',
              e.letter ? <Badge tone="positive">{e.letter}</Badge> : <Badge>Pending</Badge>,
            ])} />
        )}
      </Section>

      <Section title="My Invoices">
        {invoices.length === 0 ? <Empty text="No invoices on your account" /> : (
          <Table headers={['Description', 'Amount', 'Due', 'Status']} monoCols={[1, 2]}
            rows={invoices.map((i) => [
              i.description || '—', `RWF ${Number(i.amount).toLocaleString()}`, formatDate(i.due_date),
              i.status === 'paid' ? <Badge tone="positive">Paid</Badge> : <Badge tone="warning">{i.status}</Badge>,
            ])} />
        )}
      </Section>

      <Section title="Course Announcements">
        {announcements.length === 0 ? (
          <Empty text="Nothing posted yet in your enrolled courses" />
        ) : (
          <div className="space-y-2">
            {announcements.map((a) => (
              <div key={a.id} className="bg-white border border-line rounded-lg px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-mono text-role-academic">{a.course_code}</span>
                  <span className="text-[11px] text-ink/35 font-mono">{formatDate(a.posted_at)}</span>
                </div>
                <p className="text-[13px] text-ink">{a.content}</p>
                <p className="text-[11px] text-ink/40 mt-1">— {a.author}</p>
              </div>
            ))}
          </div>
        )}
      </Section>
    </DashboardShell>
  );
}
