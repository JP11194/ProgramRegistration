
const express = require('express');
const QRCode  = require('qrcode');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const DB_PATH = path.join(__dirname, 'data.db');
const db = new sqlite3.Database(DB_PATH);

// Create table on first run
const INIT_SQL = `CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  location_lat REAL,
  location_lng REAL,
  attended INTEGER DEFAULT 0,
  attendedAt TEXT
)`;

db.run(INIT_SQL);

app.use(bodyParser.json());
app.use(express.static('public'));

// 📥 Registration endpoint – stores in DB and returns QR
app.post('/api/register', async (req, res) => {
  const id = Date.now().toString();
  const { name, email, location } = req.body;
  const stmt = db.prepare(`INSERT INTO users (id, name, email, location_lat, location_lng) VALUES (?,?,?,?,?)`);
  stmt.run(id, name, email, location?.lat, location?.lng, err => {
    if (err) return res.status(500).json({ error: err.message });
    QRCode.toDataURL(`event-attendance:${id}`)
      .then(qrUrl => res.json({ qrUrl }))
      .catch(e => res.status(500).json({ error: e.message }));
  });
});

// 📄 Fetch single user
app.get('/api/user/:id', (req, res) => {
  db.get(`SELECT * FROM users WHERE id = ?`, [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    row ? res.json(row) : res.status(404).send('Not found');
  });
});

// ✅ Approve attendance after receptionist review
app.post('/api/attend/:id', (req, res) => {
  const now = new Date().toISOString();
  db.run(`UPDATE users SET attended = 1, attendedAt = ? WHERE id = ?`, [now, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    this.changes ? res.json({ success: true }) : res.status(404).send('User not found');
  });
});

// 📊 List of attendees
app.get('/api/attendees', (_req, res) => {
  db.all(`SELECT * FROM users WHERE attended = 1 ORDER BY attendedAt DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.listen(3000, () => console.log('Server running at http://localhost:3000'));
