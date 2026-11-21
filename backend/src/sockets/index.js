const jwt = require('jsonwebtoken');

/**
 * Wires up Socket.IO with the same JWT used for REST auth, so a socket
 * connection is authenticated the same way an HTTP request is -- no
 * separate, weaker auth path for real-time traffic.
 *
 * Rooms are named by role (e.g. "role:student") and by user
 * (e.g. "user:<id>") so a notification can target everyone in a role
 * or one specific person.
 */
function attachSockets(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Missing auth token'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch {
      next(new Error('Invalid auth token'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`role:${socket.user.role}`);
    socket.join(`user:${socket.user.id}`);
    console.log(`Socket connected: ${socket.user.email} (${socket.user.role})`);

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.user.email}`);
    });
  });
}

function notifyRole(io, role, event, payload) {
  io.to(`role:${role}`).emit(event, payload);
}

function notifyUser(io, userId, event, payload) {
  io.to(`user:${userId}`).emit(event, payload);
}

module.exports = { attachSockets, notifyRole, notifyUser };
