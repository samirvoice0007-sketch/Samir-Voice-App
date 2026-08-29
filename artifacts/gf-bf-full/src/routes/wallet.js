const express = require('express');
const User = require('../models/User');
const { auth, requireAuth } = require('../middleware/auth');

const router = express.Router();

// Diamond to coin rates (from screenshot)
const RATES = [
  { diamonds: 1000, coins: 330 },
  { diamonds: 10000, coins: 3300 },
  { diamonds: 100000, coins: 33000 },
  { diamonds: 1000000, coins: 330000 },
  { diamonds: 10000000, coins: 3300000 },
  { diamonds: 100000000, coins: 33000000 },
  { diamonds: 1000000000, coins: 330000000 }
];

router.get('/', auth, requireAuth, (req, res) => {
  res.json({
    coins: req.user.coins,
    diamonds: req.user.diamonds,
    rates: RATES
  });
});

router.post('/exchange', auth, requireAuth, async (req, res) => {
  try {
    const { diamonds } = req.body;
    const rate = RATES.find(r => r.diamonds === Number(diamonds));
    if (!rate) return res.status(400).json({ error: 'Invalid amount' });
    if (req.user.diamonds < rate.diamonds) return res.status(400).json({ error: 'Not enough diamonds' });
    req.user.diamonds -= rate.diamonds;
    req.user.coins += rate.coins;
    await req.user.save();
    res.json({ coins: req.user.coins, diamonds: req.user.diamonds });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Demo recharge (for testing)
router.post('/recharge-demo', auth, requireAuth, async (req, res) => {
  try {
    const amount = Number(req.body.coins) || 100000;
    req.user.coins += amount;
    await req.user.save();
    res.json({ coins: req.user.coins, added: amount });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
