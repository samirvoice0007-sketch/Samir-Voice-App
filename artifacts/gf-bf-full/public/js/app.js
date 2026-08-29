/* GF BF - Full Voice Party Client */
const API = '';
const state = {
  token: localStorage.getItem('gfbf_token') || '',
  user: null,
  page: 'home',
  rooms: [],
  currentRoom: null,
  socket: null,
  gifts: [],
  onMic: false,
  agoraClient: null,
  localAudio: null
};

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

function headers() {
  const h = { 'Content-Type': 'application/json' };
  if (state.token) h['Authorization'] = 'Bearer ' + state.token;
  return h;
}

async function api(path, opts = {}) {
  const res = await fetch(API + path, { ...opts, headers: { ...headers(), ...(opts.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function showScreen(id) {
  $$('.screen').forEach(s => s.classList.remove('active'));
  $('#' + id).classList.add('active');
}

function showPage(name) {
  state.page = name;
  $$('.page').forEach(p => p.classList.remove('active'));
  const map = { home: 'pageHome', message: 'pageMessage', me: 'pageMe' };
  if (map[name]) $('#' + map[name]).classList.add('active');
  $$('.nav-item[data-page]').forEach(b => b.classList.toggle('active', b.dataset.page === name));
}

/* ---------- Auth ---------- */
async function loginGuest() {
  try {
    const d = await api('/api/auth/guest', { method: 'POST', body: JSON.stringify({ lang: 'en' }) });
    state.token = d.token;
    state.user = d.user;
    localStorage.setItem('gfbf_token', d.token);
    afterLogin();
  } catch (e) { toast(e.message); }
}

async function verifyOtp() {
  const phone = $('#phoneInput').value.trim();
  const code = $('#otpInput').value.trim();
  try {
    const d = await api('/api/auth/otp/verify', { method: 'POST', body: JSON.stringify({ phone, code }) });
    state.token = d.token;
    state.user = d.user;
    localStorage.setItem('gfbf_token', d.token);
    afterLogin();
  } catch (e) { toast(e.message); }
}

async function afterLogin() {
  try {
    const me = await api('/api/auth/me');
    state.user = { ...me.user, ...me.full };
  } catch (e) {}
  connectSocket();
  showScreen('main');
  showPage('home');
  loadRooms();
  updateMeUI();
}

function updateMeUI() {
  if (!state.user) return;
  $('#meName').textContent = state.user.nickname || state.user.name || 'User';
  $('#meId').textContent = (state.user.id || '').toString().slice(-6);
  $('#meFollowers').textContent = state.user.followers || 0;
  $('#meFollowing').textContent = state.user.following || 0;
  $('#meVisitors').textContent = state.user.visitors || 0;
  if (state.user.avatar) {
    $('#meAvatar').innerHTML = `<img src="${state.user.avatar}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;
  }
}

/* ---------- Rooms ---------- */
async function loadRooms() {
  try {
    const d = await api('/api/rooms?tab=popular');
    state.rooms = d.rooms || [];
    renderRoomList();
  } catch (e) {
    state.rooms = [];
    renderRoomList();
  }
}

function renderRoomList() {
  const el = $('#roomList');
  if (!state.rooms.length) {
    el.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:#8b9bb4">No rooms yet. Create one!</div>`;
    return;
  }
  el.innerHTML = state.rooms.map(r => {
    const owner = r.owner || {};
    const title = r.name || 'Room';
    const listeners = r.onlineCount || 0;
    const flag = '🇧🇩';
    return `<div class="room-card" data-id="${r.roomId}">
      <div class="cover">${r.cover ? `<img src="${r.cover}">` : '🎤'}
        <span class="listeners">👤 ${listeners}</span>
      </div>
      <div class="info">
        <div class="title">${escapeHtml(title)}</div>
        <div class="meta">${flag} ${escapeHtml(owner.nickname || owner.name || '')}</div>
      </div>
    </div>`;
  }).join('');
  $$('.room-card', el).forEach(c => c.onclick = () => enterRoom(c.dataset.id));
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

async function createRoom() {
  try {
    const d = await api('/api/rooms', { method: 'POST', body: JSON.stringify({}) });
    toast('Room created!');
    enterRoom(d.room.roomId);
  } catch (e) { toast(e.message); }
}

async function enterRoom(roomId) {
  try {
    const d = await api('/api/rooms/' + roomId);
    state.currentRoom = d.room;
    showScreen('room');
    renderSeats();
    $('#roomName').textContent = d.room.name;
    $('#roomIdLabel').textContent = 'ID:' + d.room.roomId;
    $('#roomOnline').textContent = d.room.onlineCount || 0;
    $('#announcement').textContent = d.room.announcement || 'Welcome!';
    $('#chatFeed').innerHTML = '';
    if (state.socket) state.socket.emit('join-room', { roomId });
    // Agora optional
    initAgora(roomId).catch(() => {});
  } catch (e) { toast(e.message); }
}

function renderSeats() {
  const room = state.currentRoom;
  if (!room) return;
  const seats = room.seats || [];
  const grid = $('#seatsGrid');
  // Owner seat first (index 0), then 1-12
  let html = '';
  for (let i = 0; i < 13; i++) {
    const s = seats.find(x => x.index === i) || { index: i, locked: false };
    const user = s.userId || null;
    const isOwner = i === 0;
    const label = isOwner ? 'Owner' : 'No.' + i;
    let circleClass = 'seat-circle' + (isOwner ? ' owner' : '') + (s.locked ? ' locked' : '');
    let content = s.locked ? '🔒' : (user ? (user.avatar ? `<img src="${user.avatar}">` : '👤') : '＋');
    const name = user ? (user.nickname || user.name || '') : label;
    html += `<div class="seat" data-idx="${i}">
      <div class="${circleClass}">${content}</div>
      <div class="seat-label">${escapeHtml(name)}</div>
    </div>`;
  }
  grid.innerHTML = html;
  $$('.seat', grid).forEach(el => {
    el.onclick = () => onSeatClick(Number(el.dataset.idx));
  });
}

async function onSeatClick(idx) {
  if (!state.socket || !state.currentRoom) return;
  const seat = (state.currentRoom.seats || []).find(s => s.index === idx);
  if (seat && seat.userId && String(seat.userId._id || seat.userId) === String(state.user.id)) {
    state.socket.emit('leave-mic');
    state.onMic = false;
    return;
  }
  if (seat && seat.locked) return toast('Seat locked');
  if (seat && seat.userId) return toast('Seat taken');
  state.socket.emit('take-mic', { seatIndex: idx });
  state.onMic = true;
}

function leaveRoom() {
  if (state.socket) state.socket.emit('leave-room');
  if (state.agoraClient) {
    try { state.agoraClient.leave(); } catch (e) {}
    state.agoraClient = null;
  }
  state.currentRoom = null;
  state.onMic = false;
  showScreen('main');
  loadRooms();
}

/* ---------- Socket ---------- */
function connectSocket() {
  if (state.socket) try { state.socket.disconnect(); } catch (e) {}
  state.socket = io(window.location.origin, {
    auth: { token: state.token },
    transports: ['websocket', 'polling']
  });
  state.socket.on('connect', () => console.log('[socket] ok'));
  state.socket.on('room-update', (data) => {
    if (!state.currentRoom) return;
    if (data.onlineCount != null) {
      state.currentRoom.onlineCount = data.onlineCount;
      $('#roomOnline').textContent = data.onlineCount;
    }
    if (data.seats) {
      state.currentRoom.seats = data.seats;
      renderSeats();
    }
  });
  state.socket.on('chat', (msg) => {
    const feed = $('#chatFeed');
    const line = document.createElement('div');
    line.className = 'chat-line';
    line.innerHTML = `<span class="name">${escapeHtml(msg.from?.name)}</span>: ${escapeHtml(msg.text)}`;
    feed.appendChild(line);
    feed.scrollTop = feed.scrollHeight;
  });
  state.socket.on('gift', (g) => {
    const feed = $('#chatFeed');
    const line = document.createElement('div');
    line.className = 'chat-line gift';
    line.innerHTML = `🎁 ${escapeHtml(g.from?.name)} sent ${g.gift?.icon || ''} ${escapeHtml(g.gift?.name)} x${g.count} ${g.to ? '→ ' + escapeHtml(g.to.name) : ''}`;
    feed.appendChild(line);
    feed.scrollTop = feed.scrollHeight;
    toast(`${g.gift?.icon || '🎁'} ${g.gift?.name} x${g.count}`);
  });
  state.socket.on('coins-update', (d) => {
    if (state.user) state.user.coins = d.coins;
  });
  state.socket.on('error-msg', (m) => toast(m));
}

/* ---------- Agora (optional free tier) ---------- */
async function initAgora(channel) {
  if (!window.AgoraRTC) return;
  try {
    const d = await api(`/api/rooms/${channel}/token?uid=${Math.floor(Math.random()*1e5)}`);
    if (!d.token || !d.appId) return;
    const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    await client.join(d.appId, channel, d.token, null);
    state.agoraClient = client;
    // Don't auto publish - user takes mic first
  } catch (e) {
    console.log('Agora skip', e.message);
  }
}

/* ---------- Gifts ---------- */
async function openGiftPanel() {
  if (!state.gifts.length) {
    try {
      const d = await api('/api/gifts');
      state.gifts = d.gifts || [];
    } catch (e) {
      state.gifts = [
        { giftId: 'kiss', name: 'Kiss', icon: '💋', price: 10 },
        { giftId: 'rose', name: 'Rose', icon: '🌹', price: 50 },
        { giftId: 'heart', name: 'Heart', icon: '❤️', price: 100 },
        { giftId: 'cake', name: 'Cake', icon: '🎂', price: 500 },
        { giftId: 'car', name: 'Car', icon: '🚗', price: 2000 },
        { giftId: 'rocket', name: 'Rocket', icon: '🚀', price: 5000 }
      ];
    }
  }
  const card = $('#modalCard');
  card.innerHTML = `<h3 style="margin-bottom:12px">Send Gift</h3>
    <div class="gift-grid">${state.gifts.map(g => `
      <div class="gift-item" data-id="${g.giftId}">
        <div class="ico">${g.icon || '🎁'}</div>
        <div>${escapeHtml(g.name)}</div>
        <div class="price">🪙 ${g.price}</div>
      </div>`).join('')}</div>
    <button class="btn btn-outline" style="margin-top:16px" onclick="closeModal()">Close</button>`;
  $('#modal').classList.remove('hidden');
  $$('.gift-item', card).forEach(el => {
    el.onclick = () => {
      if (state.socket) state.socket.emit('send-gift', { giftId: el.dataset.id, count: 1 });
      closeModal();
    };
  });
}

function closeModal() {
  $('#modal').classList.add('hidden');
}

function openChatInput() {
  const text = prompt('Message:');
  if (text && state.socket) state.socket.emit('chat', { text });
}

function openWallet() {
  const card = $('#modalCard');
  const coins = state.user?.coins ?? 0;
  const diamonds = state.user?.diamonds ?? 0;
  card.innerHTML = `<h3>Wallet</h3>
    <p style="margin:12px 0">🪙 Coins: <b>${coins.toLocaleString()}</b></p>
    <p style="margin:8px 0">💎 Diamonds: <b>${diamonds.toLocaleString()}</b></p>
    <button class="btn btn-pink" id="btnDemoRecharge">Demo +100,000 Coins</button>
    <button class="btn btn-outline" style="margin-top:8px" onclick="closeModal()">Close</button>`;
  $('#modal').classList.remove('hidden');
  $('#btnDemoRecharge').onclick = async () => {
    try {
      const d = await api('/api/wallet/recharge-demo', { method: 'POST', body: JSON.stringify({ coins: 100000 }) });
      state.user.coins = d.coins;
      toast('+100,000 coins');
      closeModal();
    } catch (e) { toast(e.message); }
  };
}

function openInvite() {
  const code = state.user?.inviteCode || '------';
  const card = $('#modalCard');
  card.innerHTML = `<h3>Invite Friends</h3>
    <p style="margin:12px 0;color:#8b9bb4">Share your code & earn coins</p>
    <div style="background:rgba(0,0,0,.3);padding:16px;border-radius:12px;text-align:center;font-size:24px;letter-spacing:4px;font-weight:700">${code}</div>
    <p style="margin-top:12px;font-size:13px;color:#8b9bb4">Invite 1 friend → 300,000 coins<br>Friend recharge ≥ 600k → 300,000 more<br>Friends send gifts → 5%</p>
    <button class="btn btn-pink" style="margin-top:16px" onclick="navigator.clipboard.writeText('${code}');toast('Copied!')">Copy Code</button>
    <button class="btn btn-outline" style="margin-top:8px" onclick="closeModal()">Close</button>`;
  $('#modal').classList.remove('hidden');
}

/* ---------- Boot ---------- */
function bind() {
  $('#btnGuest').onclick = loginGuest;
  $('#btnPhone').onclick = () => $('#otpBox').classList.toggle('hidden');
  $('#btnVerifyOtp').onclick = verifyOtp;
  $('#btnGoogle').onclick = () => toast('Google login: configure OAuth client ID');
  $('#btnCreateRoom').onclick = createRoom;
  $('#btnLeaveRoom').onclick = leaveRoom;
  $('#btnGift').onclick = openGiftPanel;
  $('#btnChatInput').onclick = openChatInput;
  $('#btnCoins').onclick = openWallet;
  $('#btnMic').onclick = () => {
    if (!state.onMic) toast('Tap an empty seat to take mic');
    else {
      state.socket?.emit('leave-mic');
      state.onMic = false;
      toast('Left mic');
    }
  };

  $$('.nav-item[data-page]').forEach(b => {
    b.onclick = () => showPage(b.dataset.page);
  });

  $$('.menu-item').forEach(m => {
    m.onclick = () => {
      const go = m.dataset.go;
      if (go === 'wallet') openWallet();
      else if (go === 'invite') openInvite();
      else toast(go + ' — coming in next update');
    };
  });

  $('#modal').onclick = (e) => { if (e.target.id === 'modal') closeModal(); };
}

async function boot() {
  bind();
  setTimeout(async () => {
    if (state.token) {
      try {
        await afterLogin();
        return;
      } catch (e) {
        localStorage.removeItem('gfbf_token');
        state.token = '';
      }
    }
    showScreen('auth');
  }, 900);
}

boot();
