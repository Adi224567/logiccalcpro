const express = require('express');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'logicCalcPro_change_this_in_production_2026';

app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ══════════════════════════════════════════════════════
// IN-MEMORY STORE
// NOTE: Resets on server restart. For production,
// replace with Upstash Redis or MongoDB Atlas (both free).
// ══════════════════════════════════════════════════════
const gpsStore  = {}; // { username: { lat, lng, speed, heading, ts } }
const logsStore = {}; // { username: [fuelLog, ...] }

// ══════════════════════════════════════════════════════
// USERS  (passwords are plain for demo – use bcrypt in prod)
// ══════════════════════════════════════════════════════
const USERS = [
  {
    username: 'admin',   password: 'admin123',
    role: 'manager',     name: 'Fleet Manager',
    id: 'MGR-001'
  },
  {
    username: 'trk001',  password: 'pass123',
    role: 'driver',      name: 'Marcus Webb',
    id: 'TRK-001',       region: 'North America',
    color: '#00d4ff',    speed: 88,  fuel: 72,
    load: '18T',         eff: 15.2,  status: 'active'
  },
  {
    username: 'trk002',  password: 'pass123',
    role: 'driver',      name: 'Priya Sharma',
    id: 'TRK-002',       region: 'South Asia',
    color: '#f59e0b',    speed: 74,  fuel: 58,
    load: '12T',         eff: 13.8,  status: 'active'
  },
  {
    username: 'trk003',  password: 'pass123',
    role: 'driver',      name: 'Klaus Müller',
    id: 'TRK-003',       region: 'Europe',
    color: '#22c55e',    speed: 0,   fuel: 91,
    load: '22T',         eff: 12.1,  status: 'idle'
  },
  {
    username: 'trk004',  password: 'pass123',
    role: 'driver',      name: 'Chen Li',
    id: 'TRK-004',       region: 'East Asia',
    color: '#a78bfa',    speed: 102, fuel: 45,
    load: '8T',          eff: 16.0,  status: 'active'
  },
  {
    username: 'trk005',  password: 'pass123',
    role: 'driver',      name: 'Amara Osei',
    id: 'TRK-005',       region: 'Africa',
    color: '#f97316',    speed: 61,  fuel: 33,
    load: '25T',         eff: 11.4,  status: 'active'
  },
  {
    username: 'trk006',  password: 'pass123',
    role: 'driver',      name: 'Sofia Ramos',
    id: 'TRK-006',       region: 'South America',
    color: '#f472b6',    speed: 0,   fuel: 0,
    load: '15T',         eff: 14.5,  status: 'offline'
  },
  {
    username: 'trk007',  password: 'pass123',
    role: 'driver',      name: 'James Okafor',
    id: 'TRK-007',       region: 'Africa',
    color: '#34d399',    speed: 79,  fuel: 61,
    load: '19T',         eff: 13.1,  status: 'active'
  },
  {
    username: 'trk008',  password: 'pass123',
    role: 'driver',      name: 'Yuki Tanaka',
    id: 'TRK-008',       region: 'East Asia',
    color: '#60a5fa',    speed: 95,  fuel: 82,
    load: '11T',         eff: 14.8,  status: 'active'
  },
];

// ══════════════════════════════════════════════════════
// AUTH MIDDLEWARE
// ══════════════════════════════════════════════════════
function requireAuth(req, res, next) {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token expired or invalid' });
  }
}

function requireManager(req, res, next) {
  if (req.user.role !== 'manager') return res.status(403).json({ error: 'Manager access only' });
  next();
}

function requireDriver(req, res, next) {
  if (req.user.role !== 'driver') return res.status(403).json({ error: 'Driver access only' });
  next();
}

// ══════════════════════════════════════════════════════
// AUTH ROUTES
// ══════════════════════════════════════════════════════

// POST /api/login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const user = USERS.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid username or password' });

  const payload = { username: user.username, role: user.role, name: user.name, id: user.id };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });

  res.cookie('token', token, {
    httpOnly: true,
    maxAge: 43200000, // 12 hours
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  });

  const { password: _, ...safeUser } = user;
  res.json({ ok: true, user: safeUser });
});

// POST /api/logout
app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

// GET /api/me - verify session and get current user
app.get('/api/me', requireAuth, (req, res) => {
  const user = USERS.find(u => u.username === req.user.username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password, ...safeUser } = user;
  // Add live GPS if driver
  if (user.role === 'driver') {
    safeUser.gps = gpsStore[user.username] || null;
    safeUser.logs = logsStore[user.username] || [];
  }
  res.json(safeUser);
});

// ══════════════════════════════════════════════════════
// MANAGER ROUTES
// ══════════════════════════════════════════════════════

// GET /api/drivers - all drivers with live GPS
app.get('/api/drivers', requireAuth, requireManager, (req, res) => {
  const drivers = USERS
    .filter(u => u.role === 'driver')
    .map(({ password, ...d }) => ({
      ...d,
      gps: gpsStore[d.username] || null,
      logs: (logsStore[d.username] || []).length,
    }));
  res.json(drivers);
});

// GET /api/gps/all - get all live GPS coords (manager polls this)
app.get('/api/gps/all', requireAuth, requireManager, (req, res) => {
  res.json(gpsStore);
});

// ══════════════════════════════════════════════════════
// DRIVER ROUTES
// ══════════════════════════════════════════════════════

// POST /api/gps - driver broadcasts their location
app.post('/api/gps', requireAuth, requireDriver, (req, res) => {
  const { lat, lng, speed, heading } = req.body;
  if (lat == null || lng == null) return res.status(400).json({ error: 'lat and lng required' });
  gpsStore[req.user.username] = {
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    speed: speed || 0,
    heading: heading || 0,
    ts: Date.now()
  };
  res.json({ ok: true });
});

// DELETE /api/gps - driver stops broadcasting
app.delete('/api/gps', requireAuth, requireDriver, (req, res) => {
  delete gpsStore[req.user.username];
  res.json({ ok: true });
});

// GET /api/logs - driver gets their own fuel logs
app.get('/api/logs', requireAuth, requireDriver, (req, res) => {
  res.json(logsStore[req.user.username] || []);
});

// POST /api/logs - driver adds a fuel log
app.post('/api/logs', requireAuth, requireDriver, (req, res) => {
  const { date, location, litres, pricePerLitre, odometer, tripDistance } = req.body;
  if (!date || !location || !litres || !pricePerLitre) {
    return res.status(400).json({ error: 'date, location, litres and pricePerLitre are required' });
  }
  const L = parseFloat(litres);
  const P = parseFloat(pricePerLitre);
  const D = parseFloat(tripDistance) || 0;
  const entry = {
    id: Date.now().toString(),
    date,
    location,
    litres: L,
    pricePerLitre: P,
    totalCost: parseFloat((L * P).toFixed(2)),
    odometer: parseFloat(odometer) || null,
    tripDistance: D,
    efficiency: D && L ? parseFloat((D / L).toFixed(1)) : null,
    co2kg: parseFloat((L * 2.68).toFixed(1)),
    createdAt: new Date().toISOString()
  };
  if (!logsStore[req.user.username]) logsStore[req.user.username] = [];
  logsStore[req.user.username].unshift(entry);
  res.json(entry);
});

// DELETE /api/logs/:id - driver deletes a log
app.delete('/api/logs/:id', requireAuth, requireDriver, (req, res) => {
  const logs = logsStore[req.user.username] || [];
  logsStore[req.user.username] = logs.filter(l => l.id !== req.params.id);
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════
// CATCH-ALL → serve SPA
// ══════════════════════════════════════════════════════
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚛 Logic Calculator Pro running on http://localhost:${PORT}`);
  console.log(`   Manager login: admin / admin123`);
  console.log(`   Driver login:  trk001–trk008 / pass123\n`);
});
