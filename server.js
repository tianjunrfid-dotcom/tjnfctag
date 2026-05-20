// server.js
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = express();

app.use(express.json());

// --- Tag Schema (MongoDB) ---
const tagSchema = new mongoose.Schema({
  tagUID:       { type: String, required: true, unique: true },
  owner:        { type: String, required: true },
  accessLevel:  { type: String, enum: ['admin', 'employee', 'guest'] },
  isActive:     { type: Boolean, default: true },
  createdAt:    { type: Date, default: Date.now }
});

const NFC_Tag = mongoose.model('NFC_Tag', tagSchema);

// --- Authentication Middleware ---
function authMiddleware(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  jwt.verify(token, 'TJ_SECRET_KEY', (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.userId = decoded.id;
    next();
  });
}

// --- Register New NFC Tag ---
app.post('/api/tags/register', authMiddleware, async (req, res) => {
  try {
    const { tagUID, owner, accessLevel } = req.body;
    const newTag = new NFC_Tag({ tagUID, owner, accessLevel });
    await newTag.save();
    res.json({ success: true, message: 'Tag registered successfully' });
  } catch (err) {
    res.status(400).json({ error: 'Tag UID already exists' });
  }
});

// --- Validate NFC Tag Scan ---
app.post('/api/tags/validate', authMiddleware, async (req, res) => {
  const { tagUID } = req.body;
  const tag = await NFC_Tag.findOne({ tagUID, isActive: true });

  if (!tag) {
    return res.status(403).json({ 
      valid: false, 
      message: 'Unauthorized tag' 
    });
  }

  // Log access event
  console.log(`[ACCESS LOG] ${tag.owner} (${tag.accessLevel}) — ${new Date().toISOString()}`);

  res.json({ 
    valid: true, 
    owner: tag.owner, 
    accessLevel: tag.accessLevel 
  });
});

// --- Get All Tags (Admin Only) ---
app.get('/api/tags', authMiddleware, async (req, res) => {
  const tags = await NFC_Tag.find({});
  res.json(tags);
});

app.listen(3000, () => console.log('TJ NFC System running on port 3000'));
