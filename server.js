// server.js
const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./db'); // SQLite connection

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session setup (per-user wallet, tickets, txns)
app.use(
  session({
    secret: 'local-yatri-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // secure:true only in https
  })
);

// Serve frontend from "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// =======================
// Demo Data
// =======================
const routes = {
  B1: [
    [24.583, 73.68],
    [24.585, 73.685],
    [24.59, 73.689],
    [24.596, 73.684],
    [24.6, 73.69],
  ],
  B2: [
    [24.59, 73.689],
    [24.592, 73.692],
    [24.595, 73.695],
    [24.598, 73.7],
  ],
  B3: [
    [24.583, 73.68],
    [24.581, 73.685],
    [24.579, 73.69],
    [24.577, 73.695],
  ],
  B4: [
    [24.6, 73.69],
    [24.605, 73.692],
    [24.61, 73.695],
    [24.615, 73.698],
  ],
  B5: [
    [24.577, 73.695],
    [24.575, 73.699],
    [24.572, 73.702],
    [24.57, 73.705],
  ],
};

const stops = [
  { id: 'S1', name: 'Bus Stand', lat: 24.583, lng: 73.68, price: 10 },
  { id: 'S2', name: 'Central Market', lat: 24.59, lng: 73.689, price: 15 },
  { id: 'S3', name: 'College Gate', lat: 24.596, lng: 73.684, price: 12 },
  { id: 'S4', name: 'University', lat: 24.605, lng: 73.692, price: 18 },
  { id: 'S5', name: 'City Mall', lat: 24.61, lng: 73.695, price: 20 },
  { id: 'S6', name: 'Tech Park', lat: 24.572, lng: 73.702, price: 25 },
];

let buses = [
  { id: 'B1', fare: 15, passengers: 0 },
  { id: 'B2', fare: 20, passengers: 0 },
  { id: 'B3', fare: 12, passengers: 0 },
  { id: 'B4', fare: 18, passengers: 0 },
  { id: 'B5', fare: 25, passengers: 0 },
];

// =======================
// Helper to init DB
// =======================
db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      balance INTEGER DEFAULT 100
    )`
  );
  db.run(
    `CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT,
      amount INTEGER,
      busId TEXT,
      timestamp TEXT
    )`
  );

  // Default user row
  db.get("SELECT * FROM users WHERE id=1", (err, row) => {
    if (!row) {
      db.run("INSERT INTO users (id, balance) VALUES (1, 100)");
    }
  });
});

// =======================
// API Routes
// =======================

// Get all stops
app.get('/api/stops', (req, res) => {
  res.json(stops);
});

// Get all buses
app.get('/api/buses', (req, res) => {
  res.json(buses);
});

// Get bus routes
app.get('/api/routes/:busId', (req, res) => {
  const { busId } = req.params;
  res.json(routes[busId] || []);
});

// Wallet recharge
app.post('/api/wallet/add', (req, res) => {
  const { amount } = req.body;
  const amt = Number(amount) || 0;
  if (amt <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  const timestamp = new Date().toLocaleString();
  db.get("SELECT balance FROM users WHERE id=1", (err, row) => {
    const newBalance = (row ? row.balance : 0) + amt;
    db.run("UPDATE users SET balance=? WHERE id=1", newBalance);
    db.run(
      "INSERT INTO transactions (type, amount, busId, timestamp) VALUES (?,?,?,?)",
      ["recharge", amt, null, timestamp]
    );
    res.json({ success: true, balance: newBalance });
  });
});

// Book a bus ticket
app.post('/api/book', (req, res) => {
  const { busId } = req.body;
  const bus = buses.find((b) => b.id === busId);
  if (!bus) return res.status(404).json({ error: 'Bus not found' });

  db.get("SELECT balance FROM users WHERE id=1", (err, row) => {
    const balance = row ? row.balance : 0;
    if (balance < bus.fare) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const newBalance = balance - bus.fare;
    const timestamp = new Date().toLocaleString();

    db.run("UPDATE users SET balance=? WHERE id=1", newBalance);
    db.run(
      "INSERT INTO transactions (type, amount, busId, timestamp) VALUES (?,?,?,?)",
      ["fare", -bus.fare, busId, timestamp]
    );

    bus.passengers++;

    res.json({ success: true, balance: newBalance, ticket: { busId, fare: bus.fare, when: timestamp } });
  });
});

// Get user transactions & balance
app.get('/api/transactions', (req, res) => {
  db.get("SELECT balance FROM users WHERE id=1", (err, row) => {
    const balance = row ? row.balance : 0;
    db.all("SELECT * FROM transactions ORDER BY id DESC", (err, rows) => {
      res.json({ balance, transactions: rows });
    });
  });
});

// =======================
// Start Server
// =======================
app.listen(PORT, () => {
  console.log(`✅ Local Yatri backend running at http://localhost:${PORT}`);
});

