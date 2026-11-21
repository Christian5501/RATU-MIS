import React from 'react';
import { useSocket } from '../contexts/SocketContext';

/** Fixed-position stack of real-time notification cards -- fires the
 * instant the backend broadcasts, no refresh needed. Two kinds so far:
 * a new course opening for enrollment, and a new course announcement. */
export default function NotificationToast() {
  const { notifications, dismiss } = useSocket();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 w-80">
      {notifications.map((n) => (
        <div
          key={n.id}
          className="bg-white border border-line rounded-lg shadow-lg p-4 animate-in fade-in slide-in-from-top-2"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              {n.type === 'enrollment' && (
                <>
                  <p className="text-[12px] font-medium uppercase tracking-wide text-role-student">New course open</p>
                  <p className="text-[13px] text-ink mt-0.5">{n.code} — {n.title}</p>
                </>
              )}
              {n.type === 'announcement' && (
                <>
                  <p className="text-[12px] font-medium uppercase tracking-wide text-role-academic">{n.courseCode} announcement</p>
                  <p className="text-[13px] text-ink mt-0.5 line-clamp-3">{n.content}</p>
                </>
              )}
            </div>
            <button onClick={() => dismiss(n.id)} className="text-ink/30 hover:text-ink/60 text-[13px] leading-none">✕</button>
          </div>
        </div>
      ))}
    </div>
  );
}
