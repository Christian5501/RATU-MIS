require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth.routes');
const academicRoutes = require('./routes/academic.routes');
const recordsRoutes = require('./routes/records.routes');
const financeRoutes = require('./routes/finance.routes');
const gradesRoutes = require('./routes/grades.routes');
const enrollmentRoutes = require('./routes/enrollment.routes');
const announcementsRoutes = require('./routes/announcements.routes');
const { attachSockets } = require('./sockets/index');

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ratu-mis-backend', time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/academic', academicRoutes);
app.use('/api/academic', gradesRoutes);
app.use('/api/academic', enrollmentRoutes);
app.use('/api/academic', announcementsRoutes);
app.use('/api/records', recordsRoutes);
app.use('/api/finance', financeRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CORS_ORIGIN || '*' },
});
attachSockets(io);
app.set('io', io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`RATU MIS backend listening on port ${PORT}`);
});
