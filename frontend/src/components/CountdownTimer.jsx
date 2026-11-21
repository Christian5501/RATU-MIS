import React, { useState, useEffect } from 'react';

export default function CountdownTimer({ deadline, onExpire }) {
  const [remaining, setRemaining] = useState(() => new Date(deadline) - new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = new Date(deadline) - new Date();
      setRemaining(diff);
      if (diff <= 0) {
        clearInterval(interval);
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline, onExpire]);

  if (remaining <= 0) {
    return <span className="font-mono text-sm font-medium text-red-600">Enrollment window closed</span>;
  }

  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
  const urgent = remaining < 30 * 60 * 1000;

  return (
    <span className={`font-mono text-sm font-medium ${urgent ? 'text-red-600' : 'text-ink/70'}`}>
      {String(hours).padStart(2, '0')}h {String(minutes).padStart(2, '0')}m {String(seconds).padStart(2, '0')}s remaining
    </span>
  );
}
