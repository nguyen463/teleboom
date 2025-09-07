// server/routes/auth.js

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Import model User

const router = express.Router();

// --- 1. Endpoint untuk Registrasi Pengguna Baru ---
// URL: POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, username, password, displayName } = req.body;

    // Cek apakah semua data yang diperlukan ada
    if (!email || !username || !password || !displayName) {
      return res.status(400).json({ message: 'Please fill all required fields.' });
    }

    // Cek apakah email atau username sudah ada di database
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(409).json({ message: 'Email or username already exists.' });
    }

    // Buat pengguna baru (password akan di-hash secara otomatis oleh pre-save hook di model)
    const newUser = new User({ email, username, password, displayName });
    await newUser.save();

    res.status(201).json({ message: 'User registered successfully!' });

  } catch (error) {
    res.status(500).json({ message: 'Server error during registration.', error: error.message });
  }
});


// --- 2. Endpoint untuk Login Pengguna ---
// URL: POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Cek apakah email dan password diberikan
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password.' });
    }

    // Cari pengguna berdasarkan email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' }); // Unauthorized
    }

    // Bandingkan password yang diberikan dengan hash di database
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' }); // Unauthorized
    }

    // Buat JSON Web Token (JWT)
    const payload = {
      user: {
        id: user.id,
        username: user.username,
      },
    };

    jwt.sign(
      payload,
      'YOUR_SECRET_JWT_KEY', // Ganti dengan secret key yang aman!
      { expiresIn: '24h' }, // Token berlaku selama 24 jam
      (err, token) => {
        if (err) throw err;
        res.status(200).json({ token });
      }
    );

  } catch (error) {
    res.status(500).json({ message: 'Server error during login.', error: error.message });
  }
});


module.exports = router;
