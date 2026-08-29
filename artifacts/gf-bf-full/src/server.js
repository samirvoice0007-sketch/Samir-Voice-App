const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const config = require('./config');
const { auth } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const userRoutes = require('./routes/users');
const walletRoutes = require('./routes/wallet');

const User = require('./models/User');
const Room = require('./models/Room');
const Message = require('./models/Message');
const Gift = require('./models/Gift');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/users', userRoutes);
app.use('/api/wallet', walletRoutes);

app.get('/api/gifts', async (req, res) => {
  try {
    let gifts = await Gift.find().sort({ sort: 1 }).lean();
    if (!gifts.length) {
      gifts = DEFAULT_GIFTS;
    }
    res.json({ gifts });
  } catch (e) {
    res.json({ gifts: DEFAULT_GIFTS });
  }
});

app.get('/api/config', (req, res) => {
  res.json({
    agoraAppId: config.agoraAppId,
    appName: 'GF BF',
    version: '2.0.0'
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

const DEFAULT_GIFTS = [
  { giftId: 'kiss', name: 'Kiss', icon: '💋', price: 10, sort: 1 },
  { giftId: 'rose', name: 'Rose', icon: '🌹', price: 50, sort: 2 },
  { giftId: 'heart', name: 'Heart', icon: '❤️', price: 100, sort: 3 },
  { giftId: 'cake', name: 'Cake', icon: '🎂', price: 500, sort: 4 },
  { giftId: 'car', name: 'Car', icon: '🚗', price: 2000, sort: 5 },
  { giftId: 'rocket', name: 'Rocket', icon: '🚀', price: 5000, sort: 6 },
  { giftId: 'castle', name: 'Castle', icon: '🏰', price: 10000, sort: 7 },
  { giftId: 'lion', name: 'Lion', icon: '🦁', price: 20000, sort: 8 }
];

// Socket rooms: roomId -> Set of socketIds
const roomSockets = new Map();

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (token) {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, config.jwtSecret);
      const user = await User.findById(decoded.id);
      socket.user = user;
    }
    next();
  } catch (e) {
    next();
  }
});

io.on('connection', (socket) => {
  console.log('[socket] connected', socket.id);

  socket.on('join-room', async ({ roomId }) => {
    if (!roomId) return;
    socket.join(roomId);
    if (!roomSockets.has(roomId)) roomSockets.set(roomId, new Set());
    roomSockets.get(roomId).add(socket.id);
    socket.roomId = roomId;

    try {
      const room = await Room.findOne({ roomId });
      if (room) {
        room.onlineCount = roomSockets.get(roomId).size;
        await room.save();
        io.to(roomId).emit('room-update', {
          onlineCount: room.onlineCount,
          seats: room.seats
        });
      }
    } catch (e) {}
  });

  socket.on('leave-room', async () => {
    const roomId = socket.roomId;
    if (!roomId) return;
    socket.leave(roomId);
    if (roomSockets.has(roomId)) {
      roomSockets.get(roomId).delete(socket.id);
      try {
        const room = await Room.findOne({ roomId });
        if (room) {
          room.onlineCount = roomSockets.get(roomId).size;
          // free seat if user was on mic
          if (socket.user) {
            room.seats.forEach(s => {
              if (s.userId && String(s.userId) === String(socket.user._id)) {
                s.userId = null;
              }
            });
          }
          await room.save();
          io.to(roomId).emit('room-update', { onlineCount: room.onlineCount, seats: room.seats });
        }
      } catch (e) {}
    }
    socket.roomId = null;
  });

  socket.on('take-mic', async ({ seatIndex }) => {
    if (!socket.user || !socket.roomId) return;
    try {
      const room = await Room.findOne({ roomId: socket.roomId });
      if (!room) return;
      const seat = room.seats.find(s => s.index === Number(seatIndex));
      if (!seat || seat.locked || seat.userId) {
        socket.emit('error-msg', 'Seat not available');
        return;
      }
      // remove from any other seat
      room.seats.forEach(s => {
        if (s.userId && String(s.userId) === String(socket.user._id)) s.userId = null;
      });
      seat.userId = socket.user._id;
      await room.save();
      const populated = await Room.findOne({ roomId: socket.roomId })
        .populate('seats.userId', 'name nickname avatar level svipLevel');
      io.to(socket.roomId).emit('room-update', { seats: populated.seats });
    } catch (e) {
      socket.emit('error-msg', e.message);
    }
  });

  socket.on('leave-mic', async () => {
    if (!socket.user || !socket.roomId) return;
    try {
      const room = await Room.findOne({ roomId: socket.roomId });
      if (!room) return;
      room.seats.forEach(s => {
        if (s.userId && String(s.userId) === String(socket.user._id)) s.userId = null;
      });
      await room.save();
      io.to(socket.roomId).emit('room-update', { seats: room.seats });
    } catch (e) {}
  });

  socket.on('chat', async ({ text }) => {
    if (!socket.user || !socket.roomId || !text) return;
    const msg = {
      id: Date.now(),
      from: {
        id: socket.user._id,
        name: socket.user.nickname || socket.user.name,
        avatar: socket.user.avatar,
        level: socket.user.level,
        svipLevel: socket.user.svipLevel
      },
      text: String(text).slice(0, 300),
      type: 'text',
      at: new Date().toISOString()
    };
    io.to(socket.roomId).emit('chat', msg);
    try {
      await Message.create({
        roomId: socket.roomId,
        from: socket.user._id,
        type: 'text',
        text: msg.text
      });
    } catch (e) {}
  });

  socket.on('send-gift', async ({ toUserId, giftId, count = 1 }) => {
    if (!socket.user || !socket.roomId) return;
    try {
      const gifts = await Gift.find().lean();
      const list = gifts.length ? gifts : DEFAULT_GIFTS;
      const gift = list.find(g => g.giftId === giftId);
      if (!gift) return socket.emit('error-msg', 'Gift not found');
      const total = gift.price * count;
      if (socket.user.coins < total) return socket.emit('error-msg', 'Not enough coins');
      socket.user.coins -= total;
      await socket.user.save();

      let toUser = null;
      if (toUserId) {
        toUser = await User.findById(toUserId);
        if (toUser) {
          // optional: add charm etc.
        }
      }

      const room = await Room.findOne({ roomId: socket.roomId });
      if (room) {
        room.totalCoins = (room.totalCoins || 0) + total;
        await room.save();
      }

      const payload = {
        from: {
          id: socket.user._id,
          name: socket.user.nickname || socket.user.name,
          avatar: socket.user.avatar
        },
        to: toUser ? { id: toUser._id, name: toUser.nickname || toUser.name } : null,
        gift: { giftId: gift.giftId, name: gift.name, icon: gift.icon, price: gift.price },
        count,
        total,
        at: new Date().toISOString()
      };
      io.to(socket.roomId).emit('gift', payload);
      socket.emit('coins-update', { coins: socket.user.coins });
    } catch (e) {
      socket.emit('error-msg', e.message);
    }
  });

  socket.on('disconnect', async () => {
    const roomId = socket.roomId;
    if (roomId && roomSockets.has(roomId)) {
      roomSockets.get(roomId).delete(socket.id);
      try {
        const room = await Room.findOne({ roomId });
        if (room) {
          room.onlineCount = roomSockets.get(roomId).size;
          if (socket.user) {
            room.seats.forEach(s => {
              if (s.userId && String(s.userId) === String(socket.user._id)) s.userId = null;
            });
          }
          await room.save();
          io.to(roomId).emit('room-update', { onlineCount: room.onlineCount, seats: room.seats });
        }
      } catch (e) {}
    }
  });
});

async function boot() {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('[db] connected');
  } catch (e) {
    console.error('[db] failed', e.message);
  }
  // seed gifts if empty
  try {
    const count = await Gift.countDocuments();
    if (count === 0) {
      await Gift.insertMany(DEFAULT_GIFTS);
      console.log('[seed] gifts');
    }
  } catch (e) {}

  server.listen(config.port, () => {
    console.log(`[gf-bf] listening on :${config.port}`);
  });
}

boot();
