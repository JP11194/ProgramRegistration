
const express = require('express');
const QRCode = require('qrcode');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const DB_PATH = path.join(__dirname, 'data.db');
const db = new sqlite3.Database(DB_PATH);

// Initialize table
const INIT_SQL = `CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  ppc TEXT,
  name TEXT,
  department TEXT,
  region TEXT,
  accommodation TEXT,
  phone TEXT,
  email TEXT,
  attended INTEGER DEFAULT 0,
  attendedAt TEXT
)`;
db.run(INIT_SQL);

app.use(bodyParser.json());
app.use(express.static('public'));

// Registration with QR code
app.post('/api/register', async (req, res) => {
  const id = Date.now().toString();
  const { ppc, name, department, region, accommodation, phone, email } = req.body;
  const stmt = db.prepare(`INSERT INTO users (id, ppc, name, department, region, accommodation, phone, email) VALUES (?,?,?,?,?,?,?,?)`);
  stmt.run(id, ppc, name, department, region, accommodation, phone, email, async (err) => {
    if (err) return res.status(500).json({ error: err.message });
    const qrData = `event-attendance:${id}`;
    const qrUrl = await QRCode.toDataURL(qrData);
    res.json({ qrUrl, id, name, ppc, department, region, accommodation, phone, email });
  });
});

// Get user details by ID
app.get('/api/user/:id', (req, res) => {
  db.get(`SELECT * FROM users WHERE id = ?`, [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    row ? res.json(row) : res.status(404).send('Not found');
  });
});

// Mark attendance
app.post('/api/attend/:id', (req, res) => {
  const now = new Date().toISOString();
  db.run(`UPDATE users SET attended = 1, attendedAt = ? WHERE id = ?`, [now, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    this.changes ? res.json({ success: true }) : res.status(404).send('User not found');
  });
});

// Get all registered users
app.get('/api/all-users', (_req, res) => {
  db.all(`SELECT * FROM users ORDER BY id DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Get attended users
app.get('/api/attended-users', (_req, res) => {
  db.all(`SELECT * FROM users WHERE attended = 1 ORDER BY attendedAt DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.listen(3000, () => console.log('Server running at http://localhost:3000'));
