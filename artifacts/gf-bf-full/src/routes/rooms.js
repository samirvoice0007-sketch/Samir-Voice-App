const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Room = require('../models/Room');
const User = require('../models/User');
const { auth, requireAuth } = require('../middleware/auth');
const { buildToken } = require('../utils/agora');

const router = express.Router();

function genRoomId() {
  return String(Math.floor(10000000 + Math.random() * 90000000));
}

// List rooms
router.get('/', auth, async (req, res) => {
  try {
    const tab = req.query.tab || 'popular';
    let q = { isLive: true };
    if (tab === 'mine' && req.user) q.owner = req.user._id;
    const rooms = await Room.find(q)
      .populate('owner', 'name nickname avatar level svipLevel')
      .sort({ onlineCount: -1, updatedAt: -1 })
      .limit(50)
      .lean();
    res.json({ rooms });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create room
router.post('/', auth, requireAuth, async (req, res) => {
  try {
    const { name, password, announcement, isPrivate } = req.body;
    const roomId = genRoomId();
    const seats = Array.from({ length: 13 }, (_, i) => ({
      index: i,
      userId: i === 0 ? req.user._id : null,
      locked: false,
      muted: false
    }));
    const room = await Room.create({
      roomId,
      name: name || (req.user.nickname || req.user.name) + "'s Room",
      announcement: announcement || "Welcome to my room, let's chat together!",
      owner: req.user._id,
      password: password || '',
      isPrivate: !!isPrivate || !!password,
      seats,
      onlineCount: 1
    });
    res.json({ room });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get room detail
router.get('/:roomId', auth, async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId })
      .populate('owner', 'name nickname avatar level svipLevel')
      .populate('seats.userId', 'name nickname avatar level svipLevel')
      .populate('admins', 'name nickname avatar')
      .lean();
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json({ room });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Agora token
router.get('/:roomId/token', auth, requireAuth, (req, res) => {
  const uid = req.query.uid || Math.floor(Math.random() * 100000);
  const result = buildToken(req.params.roomId, uid, req.query.role || 'publisher');
  res.json(result);
});

// Update room settings
router.patch('/:roomId', auth, requireAuth, async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });
    if (!room) return res.status(404).json({ error: 'Not found' });
    if (String(room.owner) !== String(req.user._id) && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Only owner' });
    }
    const allowed = ['name', 'announcement', 'password', 'isPrivate', 'whoCanChat', 'whoCanMic', 'maxMic', 'superMic', 'theme'];
    allowed.forEach(k => {
      if (req.body[k] !== undefined) room[k] = req.body[k];
    });
    room.updatedAt = new Date();
    await room.save();
    res.json({ room });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
