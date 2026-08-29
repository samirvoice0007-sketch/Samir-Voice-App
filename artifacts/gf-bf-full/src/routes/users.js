const express = require('express');
const User = require('../models/User');
const { auth, requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json({ user: user.toPublic() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/me', auth, requireAuth, async (req, res) => {
  try {
    const u = req.user;
    const fields = ['nickname', 'name', 'avatar', 'gender', 'birthday', 'bio', 'country', 'language', 'theme'];
    fields.forEach(f => {
      if (req.body[f] !== undefined) u[f] = req.body[f];
    });
    await u.save();
    res.json({ user: u.toPublic() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Daily reward claim
router.post('/daily-reward', auth, requireAuth, async (req, res) => {
  try {
    const u = req.user;
    const now = new Date();
    const last = u.lastDailyReward ? new Date(u.lastDailyReward) : null;
    if (last && (now - last) < 20 * 60 * 60 * 1000) {
      return res.status(400).json({ error: 'Already claimed today' });
    }
    const day = (u.dailyRewardDay % 7) + 1;
    const rewards = [6000, 6000, 8000, 10000, 12000, 15000, 50000];
    const amount = rewards[day - 1] || 6000;
    u.coins += amount;
    u.dailyRewardDay = day;
    u.lastDailyReward = now;
    await u.save();
    res.json({ day, coins: amount, total: u.coins });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Invite info
router.get('/me/invite', auth, requireAuth, async (req, res) => {
  res.json({
    code: req.user.inviteCode,
    count: req.user.inviteCount,
    totalCoins: req.user.totalInviteCoins
  });
});

module.exports = router;
