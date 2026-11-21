import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const ROLE_STYLES = {
  student: { rail: 'bg-role-student', soft: 'bg-role-student-soft', text: 'text-role-student', label: 'Student' },
  academic: { rail: 'bg-role-academic', soft: 'bg-role-academic-soft', text: 'text-role-academic', label: 'Academic Staff' },
  finance: { rail: 'bg-role-finance', soft: 'bg-role-finance-soft', text: 'text-role-finance', label: 'Finance' },
  admin: { rail: 'bg-role-admin', soft: 'bg-role-admin-soft', text: 'text-role-admin', label: 'Administration' },
};

export default function DashboardShell({ role, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const styles = ROLE_STYLES[role] || ROLE_STYLES.student;

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex bg-canvas">
      <div className={`w-2 shrink-0 ${styles.rail}`} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <header className="border-b border-line bg-canvas/95 backdrop-blur">
          <div className="max-w-5xl mx-auto px-8 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${styles.soft} ${styles.text}`}>
                {(user?.fullName || user?.full_name || '?').charAt(0)}
              </span>
              <div>
                <p className="text-[13px] font-medium uppercase tracking-wide text-ink/50">{styles.label}</p>
                <h1 className="text-[15px] font-semibold text-ink leading-tight">
                  {user?.fullName || user?.full_name}
                  <span className="font-normal text-ink/50"> · {user?.campus}</span>
                </h1>
              </div>
            </div>
            <button onClick={handleLogout} className="text-[13px] font-medium text-ink/50 hover:text-ink transition">
              Sign out
            </button>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-8 py-10">{children}</main>
      </div>
    </div>
  );
}
