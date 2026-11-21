import React, { useEffect, useState } from 'react';
import axios from 'axios';
import DashboardShell from '../components/DashboardShell';
import { Section, Empty, Badge } from '../components/Table';

export default function AdminDashboard() {
  const [admissions, setAdmissions] = useState([]);
  const [error, setError] = useState('');
  const [reviewing, setReviewing] = useState(null);

  function reload() {
    axios.get('/api/records/admissions').then((res) => setAdmissions(res.data)).catch(() => setError('Could not load admissions'));
  }

  useEffect(() => {
    let ignore = false;
    axios.get('/api/records/admissions')
      .then((res) => { if (!ignore) setAdmissions(res.data); })
      .catch(() => { if (!ignore) setError('Could not load admissions'); });
    return () => { ignore = true; };
  }, []);

  async function review(id, status) {
    setReviewing(id);
    try {
      await axios.patch(`/api/records/admissions/${id}`, { status });
      reload();
    } catch {
      setError('Could not update that application');
    } finally {
      setReviewing(null);
    }
  }

  const pendingCount = admissions.filter((a) => a.status === 'pending').length;

  return (
    <DashboardShell role="admin">
      {error && <p className="text-[13px] text-red-600 mb-4">{error}</p>}
      <Section title="Admissions Queue" eyebrow={`${pendingCount} pending review`}>
        {admissions.length === 0 ? <Empty text="No applications submitted yet" /> : (
          <div className="space-y-2">
            {admissions.map((a) => (
              <div key={a.id} className="flex items-center justify-between bg-white border border-line rounded-lg px-4 py-3">
                <div>
                  <p className="text-[14px] font-medium text-ink">{a.applicant_name}</p>
                  <p className="text-[12px] text-ink/45">{a.program} · {a.applicant_email}</p>
                </div>
                <div className="flex items-center gap-3">
                  {a.status === 'accepted' && <Badge tone="positive">Accepted</Badge>}
                  {a.status === 'rejected' && <Badge tone="negative">Rejected</Badge>}
                  {a.status === 'pending' && (
                    <>
                      <Badge>Pending</Badge>
                      <button onClick={() => review(a.id, 'accepted')} disabled={reviewing === a.id}
                        className="text-[12px] font-medium text-role-student hover:underline disabled:opacity-50">Accept</button>
                      <button onClick={() => review(a.id, 'rejected')} disabled={reviewing === a.id}
                        className="text-[12px] font-medium text-red-600 hover:underline disabled:opacity-50">Reject</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </DashboardShell>
  );
}
