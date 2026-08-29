const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const config = require('../config');
const { auth, requireAuth } = require('../middleware/auth');

const router = express.Router();

function sign(user) {
  return jwt.sign({ id: user._id }, config.jwtSecret, { expiresIn: config.jwtExpires });
}

// Guest login
router.post('/guest', async (req, res) => {
  try {
    const name = (req.body.name || 'Guest') + Math.floor(Math.random() * 9000 + 1000);
    const inviteCode = uuidv4().slice(0, 8).toUpperCase();
    const user = await User.create({
      name,
      nickname: name,
      inviteCode,
      coins: 1000,
      language: req.body.lang || 'en'
    });
    const token = sign(user);
    res.json({ token, user: user.toPublic() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Phone OTP (stub - accept any 6 digit for testing)
router.post('/otp/send', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone required' });
  // In production integrate Firebase / SMS
  res.json({ ok: true, message: 'OTP sent (demo: use 123456)' });
});

router.post('/otp/verify', async (req, res) => {
  try {
    const { phone, code, name } = req.body;
    if (!phone || code !== '123456') return res.status(400).json({ error: 'Invalid OTP' });
    let user = await User.findOne({ phone });
    if (!user) {
      user = await User.create({
        phone,
        name: name || 'User' + phone.slice(-4),
        nickname: name || 'User' + phone.slice(-4),
        inviteCode: uuidv4().slice(0, 8).toUpperCase(),
        coins: 1000
      });
    }
    const token = sign(user);
    res.json({ token, user: user.toPublic() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Google (stub - accept id_token as googleId for demo)
router.post('/google', async (req, res) => {
  try {
    const { googleId, email, name, avatar } = req.body;
    if (!googleId) return res.status(400).json({ error: 'googleId required' });
    let user = await User.findOne({ $or: [{ googleId }, { email }] });
    if (!user) {
      user = await User.create({
        googleId,
        email,
        name: name || 'Google User',
        nickname: name || 'Google User',
        avatar: avatar || '',
        inviteCode: uuidv4().slice(0, 8).toUpperCase(),
        coins: 1000
      });
    } else {
      user.googleId = googleId;
      if (avatar) user.avatar = avatar;
      await user.save();
    }
    const token = sign(user);
    res.json({ token, user: user.toPublic() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/me', auth, requireAuth, (req, res) => {
  res.json({ user: req.user.toPublic(), full: {
    coins: req.user.coins,
    diamonds: req.user.diamonds,
    level: req.user.level,
    svipLevel: req.user.svipLevel,
    inviteCode: req.user.inviteCode,
    language: req.user.language
  }});
});

module.exports = router;
