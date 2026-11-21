const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');

const VALID_ROLES = ['student', 'academic', 'finance', 'admin'];

async function register(req, res) {
  const { email, password, fullName, role, campus, registrationNumber, department } = req.body;

  if (!email || !password || !fullName || !role) {
    return res.status(400).json({ error: 'email, password, fullName, and role are required' });
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` });
  }
  if (role === 'student' && !registrationNumber) {
    return res.status(400).json({ error: 'registrationNumber is required for student accounts -- it is how grade uploads match a student' });
  }

  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = uuidv4();

    await pool.query(
      `INSERT INTO users (id, email, password_hash, full_name, registration_number, department, role, campus)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, email, passwordHash, fullName, registrationNumber || null, department || null, role, campus || 'Kigali']
    );

    const user = { id, email, full_name: fullName, registration_number: registrationNumber || null, department: department || null, role, campus: campus || 'Kigali' };
    const token = signToken(user);

    res.status(201).json({ token, user });
  } catch (err) {
    console.error('register error:', err.message);
    res.status(500).json({ error: 'Registration failed' });
  }
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, email, password_hash, full_name, registration_number, department, role, campus FROM users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = rows[0];
    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    delete user.password_hash;
    const token = signToken(user);

    res.json({ token, user });
  } catch (err) {
    console.error('login error:', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, fullName: user.full_name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

module.exports = { register, login };
