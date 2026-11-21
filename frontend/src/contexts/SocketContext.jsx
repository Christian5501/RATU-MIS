import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token, user } = useAuth();
  const socketRef = useRef(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!token || !user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }

    const socket = io('/', { auth: { token }, path: '/socket.io' });
    socketRef.current = socket;

    // Students hear about new courses opening for self-enrollment.
    socket.on('course:enrollment-opened', (payload) => {
      if (user.role !== 'student') return;
      setNotifications((prev) => [
        { id: `enroll-${payload.courseId}-${Date.now()}`, type: 'enrollment', ...payload },
        ...prev,
      ]);
    });

    // Any enrolled student hears about a new announcement on their course.
    socket.on('course:announcement-posted', (payload) => {
      setNotifications((prev) => [
        { id: `ann-${payload.announcementId}-${Date.now()}`, type: 'announcement', ...payload },
        ...prev,
      ]);
    });

    return () => socket.disconnect();
  }, [token, user]);

  function dismiss(id) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  return (
    <SocketContext.Provider value={{ notifications, dismiss }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used inside a SocketProvider');
  return ctx;
}
