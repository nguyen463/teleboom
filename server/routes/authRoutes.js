const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// =========================
// 1. Registrasi Pengguna
// =========================
router.post('/register', async (req, res) => {
  try {
    const { email, username, password, displayName } = req.body;

    // Validasi input
    if (!email || !username || !password || !displayName) {
      return res.status(400).json({ message: 'Please fill all required fields.' });
    }

    // Validasi email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email' });
    }

    // Validasi password strength
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Cek duplikat (case insensitive)
    const existingUser = await User.findOne({ 
      $or: [
        { email: email.toLowerCase().trim() }, 
        { username: username.toLowerCase().trim() }
      ] 
    });
    
    if (existingUser) {
      return res.status(409).json({ message: 'Email or username already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Buat user baru
    const newUser = new User({ 
      email: email.toLowerCase().trim(),
      username: username.toLowerCase().trim(), 
      password: hashedPassword, 
      displayName: displayName.trim()
    });

    await newUser.save();
    res.status(201).json({ message: 'User registered successfully!' });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration.' });
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

    // Cari user (case insensitive)
    const user = await User.findOne({ 
      email: email.toLowerCase().trim() 
    });
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Generate JWT token
    const payload = { 
      userId: user._id, 
      username: user.username 
    };
    
    const token = jwt.sign(
      payload, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );

    // Response
    res.status(200).json({ 
      token, 
      user: { 
        id: user._id, 
        username: user.username, 
        displayName: user.displayName,
        email: user.email
      } 
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

module.exports = router;
