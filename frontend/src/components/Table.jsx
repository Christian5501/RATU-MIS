import React from 'react';

export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function Section({ title, eyebrow, action, children }) {
  return (
    <div className="mb-10">
      <div className="flex items-end justify-between mb-4 gap-4">
        <div>
          {eyebrow && <p className="text-[11px] font-medium uppercase tracking-wider text-ink/40 mb-0.5">{eyebrow}</p>}
          <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function Empty({ text }) {
  return (
    <div className="border border-dashed border-line rounded-lg px-6 py-8 text-center">
      <p className="text-[13px] text-ink/40">{text}</p>
    </div>
  );
}

export function Table({ headers, rows, monoCols = [] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white">
      <table className="min-w-full text-[13px]">
        <thead>
          <tr className="border-b border-line">
            {headers.map((h) => (
              <th key={h} className="text-left px-4 py-2.5 font-medium text-ink/50 text-[11px] uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-canvas/60 transition-colors">
              {row.map((cell, j) => (
                <td key={j} className={`px-4 py-2.5 text-ink ${monoCols.includes(j) ? 'font-mono text-[12.5px]' : ''}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Badge({ tone = 'neutral', children }) {
  const tones = {
    neutral: 'bg-ink/5 text-ink/60',
    positive: 'bg-role-student-soft text-role-student',
    warning: 'bg-role-finance-soft text-role-finance',
    negative: 'bg-red-50 text-red-700',
  };
  return <span className={`inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full ${tones[tone]}`}>{children}</span>;
}
