// server/routes/auth.js

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Import model User

const router = express.Router();

// =========================
// 1. Registrasi Pengguna
// =========================
router.post('/register', async (req, res) => {
  try {
    const { email, username, password, displayName } = req.body;

    if (!email || !username || !password || !displayName) {
      return res.status(400).json({ message: 'Please fill all required fields.' });
    }

    // Cek duplikat
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(409).json({ message: 'Email or username already exists.' });
    }

    // Hash password sebelum disimpan
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({ 
      email, 
      username, 
      password: hashedPassword, 
      displayName 
    });

    await newUser.save();
    res.status(201).json({ message: 'User registered successfully!' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during registration.', error: error.message });
  }
});

// =========================
// 2. Login Pengguna
// =========================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Gunakan JWT_SECRET dari .env
    const payload = { user: { id: user.id, username: user.username } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.status(200).json({ token, user: { id: user.id, username: user.username, displayName: user.displayName } });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during login.', error: error.message });
  }
});

module.exports = router;
