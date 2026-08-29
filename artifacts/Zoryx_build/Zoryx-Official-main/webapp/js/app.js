(function () {
  const tg = window.Telegram ? window.Telegram.WebApp : null;
  if (tg) {
    tg.ready();
    tg.expand();
    try { tg.setHeaderColor('#0a0a0a'); } catch (e) {}
  }

  const initData = tg ? tg.initData : '';
  let state = {
    me: null,
    tasks: [],
    selectedPlatform: 'telegram_channel',
    selectedAction: 'join',
    userSelectedPlatform: 'telegram_channel',
    activePlatformFilter: 'all',
    activeLbTab: 'tasks',
    activeActivityCat: 'invite',
    weeklyTimerInterval: null,
    verifyTaskId: null,
  };

  const PLATFORM_ACTIONS = {
    telegram_channel: ['join'],
    telegram_bot: ['start'],
    discord: ['join'],
    tiktok: ['follow', 'like', 'comment', 'share'],
    youtube: ['subscribe', 'like', 'comment'],
    instagram: ['follow', 'like', 'comment', 'share'],
    facebook: ['follow', 'like', 'comment', 'share'],
    twitter: ['follow', 'like', 'comment', 'repost'],
    website: ['visit'],
  };
  const MANUAL_VERIFY_PLATFORMS = ['discord', 'tiktok', 'youtube', 'instagram', 'facebook', 'twitter'];

  async function api(path, opts = {}) {
    const res = await fetch(`/api${path}`, {
      method: opts.method || 'GET',
      headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': initData },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || data.error || 'Request failed');
    return data;
  }

  let toastTimer;
  function showToast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), 2600);
  }

  let pnTimer;
  function playNotifSound() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(880, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
      o.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + 0.4);
    } catch (e) {}
  }

  function showPremiumNotif(title, msg, type) {
    const box = document.getElementById('premiumNotif');
    if (!box) { showToast(title + (msg ? ' — ' + msg : '')); return; }
    const t = document.getElementById('pnTitle');
    const m = document.getElementById('pnMsg');
    if (t) t.textContent = title || 'Success';
    if (m) m.textContent = msg || '';
    box.classList.remove('hidden', 'warn', 'info', 'show');
    if (type === 'warn') box.classList.add('warn');
    if (type === 'info') box.classList.add('info');
    // force reflow then slide in from right
    void box.offsetWidth;
    box.classList.add('show');
    playNotifSound();
    clearTimeout(pnTimer);
    pnTimer = setTimeout(() => {
      box.classList.remove('show');
      setTimeout(() => box.classList.add('hidden'), 400);
    }, 4200);
    const close = document.getElementById('pnClose');
    if (close) close.onclick = () => {
      box.classList.remove('show');
      box.classList.add('hidden');
    };
  }


  let rewardPopupTimer;
  function showRewardPopup(amountUSDT) {
    const el = document.getElementById('rewardPopup');
    document.getElementById('rewardPopupAmount').textContent = fmtUsdt(amountUSDT);
    el.classList.remove('hidden');
    clearTimeout(rewardPopupTimer);
    rewardPopupTimer = setTimeout(() => el.classList.add('hidden'), 1800);
  }
  document.getElementById('rewardPopup').addEventListener('click', () => {
    document.getElementById('rewardPopup').classList.add('hidden');
  });

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function fmtUsdt(n) {
    return Number(n || 0).toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
  }

  // ================= Navigation =================
  function navigate(page) {
    document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.nav === page));
    if (page === 'tasks') { loadTasks(); loadAdHistory(); }
    if (page === 'rank') { loadStats(); loadLeaderboard(); }
    if (page === 'activity') { loadAchievements(); loadEvents(); }
  }
  document.querySelectorAll('[data-nav]').forEach((btn) => {
    btn.addEventListener('click', () => {
      navigate(btn.dataset.nav);
      if (btn.dataset.openWithdraw) openWithdrawModal();
    });
  });

  // ================= Ticker =================
  const TICKER_NAMES = ['J***6', 'T***E', 'L***6', 'S***A', 'E***1', 'M***y', 'CI***s', 'Am***2', 'R***k', 'F***a'];
  function randomAmount() {
    // 60% of the time show a smaller amount (50–100 USDT), 40% of the time a larger one (100–3000 USDT)
    let amount;
    if (Math.random() < 0.6) {
      amount = Math.random() * (100 - 50) + 50;
    } else {
      amount = Math.random() * (3000 - 100) + 100;
    }
    return amount.toFixed(3);
  }
  function tickTicker() {
    const name = TICKER_NAMES[Math.floor(Math.random() * TICKER_NAMES.length)];
    const el = document.getElementById('tickerText');
    if (!el) return;
    const msg = `💰 ${name} ${I18N.t('justWithdrew')} ${randomAmount()} USDT  ·  ⚡ ZORY X BOT  ·  `;
    // seamless RTL strip: duplicate text for continuous marquee
    el.textContent = msg + msg + msg;
    el.classList.remove('tick-in');
    void el.offsetWidth;
    el.classList.add('tick-in');
  }
  tickTicker();
  setInterval(tickTicker, 12000);

  // ================= Load current user =================
  async function loadMe() {
    const me = await api('/me');
    state.me = me;
    if (typeof updateDepositWithdrawUI === 'function') updateDepositWithdrawUI(!!me.hasDeposited);

    const fullName = `${me.firstName || ''} ${me.lastName || ''}`.trim() || 'Player';
    document.getElementById('userName').textContent = fullName;
    document.getElementById('userName2').textContent = fullName;
    document.getElementById('userUsername').textContent = me.username ? `@${me.username}` : '';
    const avatarUrl = me.photoUrl || 'https://api.dicebear.com/7.x/identicon/svg?seed=' + me.telegramId;
    document.getElementById('userPhoto').src = avatarUrl;
    document.getElementById('userPhoto2').src = avatarUrl;

    document.getElementById('usdtBalance').textContent = Number(me.balanceUSDT).toFixed(3);
    document.getElementById('referralCountHome').textContent = me.referralCount;
    document.getElementById('tasksDoneHome').textContent = me.completedTasksCount;
    document.getElementById('walletUSDT').textContent = Number(me.balanceUSDT).toFixed(3);

    document.getElementById('checkinStreak').textContent = me.checkInStreak;
    document.getElementById('checkinStreak2').textContent = me.checkInStreak;
    document.getElementById('checkinReward').textContent = fmtUsdt(me.dailyCheckInRewardUSDT);
    document.getElementById('checkinReward2').textContent = fmtUsdt(me.dailyCheckInRewardUSDT);
    setCheckinButtons(me.canCheckInToday);

    document.getElementById('adRewardText').textContent = fmtUsdt(me.adRewardUSDT);

    document.getElementById('addTaskFab').classList.toggle('hidden', !me.isAdmin);
    document.getElementById('pendingRequestsBtn').classList.toggle('hidden', !me.isAdmin);
    document.getElementById('pendingVerifyBtn').classList.toggle('hidden', !me.isAdmin);
    document.getElementById('editAdRewardBtn').classList.toggle('hidden', !me.isAdmin);
    document.getElementById('createEventFab').classList.toggle('hidden', !me.isAdmin);
    if (me.isAdmin) {
      refreshPendingRequestsCount();
      refreshPendingVerifyCount();
    }

    document.getElementById('taskNotifLink').href = me.officialChannel;
    document.getElementById('announcementsLink').href = me.officialChannel;
    document.getElementById('communityLink').href = me.communityChannel;

    document.getElementById('postTaskDescText').textContent = I18N.t('postTaskDesc').replace('{amount}', me.taskPostPaymentUSDT);

    if (!me.language) {
      document.getElementById('langModal').classList.remove('hidden');
    } else {
      await I18N.load(me.language);
      document.getElementById('postTaskDescText').textContent = I18N.t('postTaskDesc').replace('{amount}', me.taskPostPaymentUSDT);
    }
  }

  function setCheckinButtons(canCheckIn) {
    [document.getElementById('checkinBtn'), document.getElementById('checkinBtn2')].forEach((btn) => {
      btn.disabled = !canCheckIn;
      btn.textContent = canCheckIn ? I18N.t('checkIn') : '✔ ' + I18N.t('completed');
    });
  }

  async function doCheckIn() {
    try {
      const result = await api('/checkin', { method: 'POST' });
      document.getElementById('usdtBalance').textContent = Number(result.balanceUSDT).toFixed(3);
      document.getElementById('checkinStreak').textContent = result.checkInStreak;
      document.getElementById('checkinStreak2').textContent = result.checkInStreak;
      setCheckinButtons(false);
      showRewardPopup(result.rewardedUSDT);
      showPremiumNotif('Check-in!', `Added ${Number(result.rewardedUSDT).toFixed(4)} USDT to wallet.`, 'ok');
    } catch (e) {
      showToast(e.message);
    }
  }
  document.getElementById('checkinBtn').addEventListener('click', doCheckIn);
  document.getElementById('checkinBtn2').addEventListener('click', doCheckIn);

  // ================= Language =================
  document.getElementById('langBtn').addEventListener('click', () => document.getElementById('langModal').classList.remove('hidden'));
  document.querySelectorAll('.lang-option').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const lang = btn.dataset.lang;
      await api('/language', { method: 'POST', body: { lang } });
      await I18N.load(lang);
      if (state.me) document.getElementById('postTaskDescText').textContent = I18N.t('postTaskDesc').replace('{amount}', state.me.taskPostPaymentUSDT);
      document.getElementById('langModal').classList.add('hidden');
      showToast('✅');
    });
  });
  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => document.getElementById(btn.dataset.close).classList.add('hidden'));
  });

  // ================= Tasks =================
  // Real brand-colored logos (SVG masked onto a brand-color circle) for
  // platforms with an actual company logo. telegram_bot/website keep a
  // generic emoji since there's no single "brand" for those.
  const PLATFORM_LOGO = {
    telegram_channel: { url: 'https://cdn.jsdelivr.net/npm/simple-icons@11/icons/telegram.svg', bg: '#26A5E4' },
    discord: { url: 'https://cdn.jsdelivr.net/npm/simple-icons@11/icons/discord.svg', bg: '#5865F2' },
    tiktok: { url: 'https://cdn.jsdelivr.net/npm/simple-icons@11/icons/tiktok.svg', bg: '#000000' },
    instagram: { url: 'https://cdn.jsdelivr.net/npm/simple-icons@11/icons/instagram.svg', bg: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' },
    youtube: { url: 'https://cdn.jsdelivr.net/npm/simple-icons@11/icons/youtube.svg', bg: '#FF0000' },
    facebook: { url: 'https://cdn.jsdelivr.net/npm/simple-icons@11/icons/facebook.svg', bg: '#1877F2' },
    twitter: { url: 'https://cdn.jsdelivr.net/npm/simple-icons@11/icons/x.svg', bg: '#000000' },
  };
  const PLATFORM_ICON = {
    telegram_bot: '🤖', website: '🌐',
  };

  function platformIconHtml(platform) {
    const logo = PLATFORM_LOGO[platform];
    if (logo) {
      return `<div class="task-icon" style="background:${logo.bg}"><span class="brand-mask" style="-webkit-mask-image:url('${logo.url}');mask-image:url('${logo.url}')"></span></div>`;
    }
    return `<div class="task-icon">${PLATFORM_ICON[platform] || '🌐'}</div>`;
  }

  function renderTaskCard(task, showAdminControls) {
    let secondaryBtnHtml = '';
    if (task.status === 'completed') {
      secondaryBtnHtml = `<button class="task-action-btn done" disabled>✔ ${I18N.t('completed')}</button>`;
    } else if (task.status === 'claimable') {
      secondaryBtnHtml = `<button class="task-action-btn claimable" data-claim="${task.id}">🎁 ${I18N.t('claim')}</button>`;
    } else if (task.status === 'pending_verification') {
      secondaryBtnHtml = `<button class="task-action-btn pending" disabled>⏳ ${I18N.t('pendingReview')}</button>`;
    } else if (task.status === 'started') {
      if (task.verificationMode === 'manual') {
        secondaryBtnHtml = `<button class="task-action-btn verify small" data-verify="${task.id}">${I18N.t('verifyNow')}</button>`;
      } else {
        secondaryBtnHtml = `<button class="task-action-btn check small" data-check="${task.id}">${I18N.t('check')}</button>`;
      }
    }
    // "Go" is always shown and never disabled/hidden, regardless of status
    const goBtnHtml = `<button class="task-action-btn go" data-go="${task.id}" data-url="${task.url}">${I18N.t('go')}</button>`;

    const deleteHtml = showAdminControls
      ? `<button class="task-delete-btn" data-delete="${task.id}" title="${I18N.t('delete')}">🗑</button>`
      : '';
    const pinHtml = showAdminControls
      ? `<button class="task-pin-btn" data-pin="${task.id}" data-pinned="${task.pinned ? '1' : '0'}">${task.pinned ? '📌 Unpin' : '📌 Pin'}</button>`
      : '';
    const card = document.createElement('div');
    card.className = 'task-card' + (task.pinned ? ' pinned-task' : '');
    card.dataset.platform = task.platform;
    card.dataset.title = task.title.toLowerCase();
    card.innerHTML = `
      <div class="task-badge">${task.pinned ? '📌 PINNED' : I18N.t('mustDoTag')}</div>
      ${platformIconHtml(task.platform)}
      <div class="task-info">
        <h4>${escapeHtml(task.title)}</h4>
        <span>+💵${fmtUsdt(task.rewardUSDT)} USDT</span>
        <span class="task-action-tag">${I18N.t('action_' + task.actionType) || task.actionType}</span>
      </div>
      <div class="task-btn-group">${goBtnHtml}${secondaryBtnHtml}</div>
      ${pinHtml}
      ${deleteHtml}
    `;
    return card;
  }

  function attachTaskHandlers(container) {
    container.querySelectorAll('[data-go]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const taskId = btn.dataset.go;
        const url = btn.dataset.url;
        try {
          await api('/tasks/go', { method: 'POST', body: { taskId } });
          if (tg && tg.openTelegramLink && /t\.me\//.test(url)) tg.openTelegramLink(url);
          else if (tg && tg.openLink) tg.openLink(url, { try_instant_view: false });
          else window.open(url, '_blank');
          loadTasks();
        } catch (e) { showToast(e.message); }
      });
    });
    container.querySelectorAll('[data-check]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const taskId = btn.dataset.check;
        if (btn.disabled) return; // already processing, ignore repeat taps

        btn.disabled = true;
        btn.classList.remove('check');
        btn.classList.add('processing');
        btn.textContent = I18N.t('processing') || 'Processing...';

        setTimeout(async () => {
          try {
            const result = await api('/tasks/check', { method: 'POST', body: { taskId } });
            if (result.status === 'claimable') {
              showToast(I18N.t('verifiedNowClaim'));
              loadTasks();
            } else if (result.status === 'completed') {
              loadTasks();
            }
          } catch (e) {
            showToast(e.message);
            btn.disabled = false;
            btn.classList.remove('processing');
            btn.classList.add('check');
            btn.textContent = I18N.t('check');
          }
        }, 10000);
      });
    });
    container.querySelectorAll('[data-claim]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const taskId = btn.dataset.claim;
        btn.disabled = true;
        try {
          const result = await api('/tasks/claim', { method: 'POST', body: { taskId } });
          showPremiumNotif('Claimed!', `Added ${Number(result.rewardedUSDT || result.rewardUSDT || 0).toFixed(4)} USDT to wallet.`, 'ok');
          document.getElementById('usdtBalance').textContent = Number(result.balanceUSDT).toFixed(3);
          document.getElementById('walletUSDT').textContent = Number(result.balanceUSDT).toFixed(3);
          showRewardPopup(result.rewardUSDT);
          loadTasks();
        } catch (e) { showToast(e.message); btn.disabled = false; }
      });
    });
    container.querySelectorAll('[data-verify]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.verifyTaskId = btn.dataset.verify;
        document.getElementById('verifyUsernameInput').value = '';
        document.getElementById('verifyModal').classList.remove('hidden');
      });
    });
    container.querySelectorAll('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const taskId = btn.dataset.delete;
        if (!window.confirm(I18N.t('confirmDeleteTask'))) return;
        try {
          await api(`/tasks/${taskId}`, { method: 'DELETE' });
          showToast(I18N.t('taskDeleted'));
          loadTasks();
        } catch (e) { showToast(e.message); }
      });

    container.querySelectorAll('[data-pin]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.pin;
        const pinned = btn.dataset.pinned !== '1';
        try {
          await api('/tasks/' + id + '/pin', { method: 'POST', body: { pinned } });
          showPremiumNotif(pinned ? 'Pinned' : 'Unpinned', pinned ? 'Task moved to top' : 'Pin removed', 'info');
          loadTasks();
        } catch (e) { showToast(e.message); }
      });
    });

    });
  }

  document.getElementById('submitVerifyBtn').addEventListener('click', async () => {
    const username = document.getElementById('verifyUsernameInput').value.trim();
    if (!username) return showToast(I18N.t('fillAllFields'));
    try {
      await api('/tasks/verify', { method: 'POST', body: { taskId: state.verifyTaskId, username } });
      showToast(I18N.t('verifySubmitted'));
      document.getElementById('verifyModal').classList.add('hidden');
      loadTasks();
    } catch (e) { showToast(e.message); }
  });

  async function loadTasks() {
    const listEl = document.getElementById('taskList');
    listEl.innerHTML = `<p class="muted">${I18N.t('loading')}</p>`;
    const { tasks } = await api('/tasks');
    state.tasks = tasks;

    const previewEl = document.getElementById('homeTaskPreview');
    previewEl.innerHTML = '';
    tasks.slice(0, 3).forEach((t) => previewEl.appendChild(renderTaskCard(t, false)));
    attachTaskHandlers(previewEl);

    renderFilteredTasks();
  }

  function renderFilteredTasks() {
    const listEl = document.getElementById('taskList');
    const query = (document.getElementById('taskSearchInput').value || '').toLowerCase();
    const filtered = state.tasks.filter((t) => {
      const platformMatch = state.activePlatformFilter === 'all' || t.platform === state.activePlatformFilter;
      const searchMatch = !query || t.title.toLowerCase().includes(query);
      return platformMatch && searchMatch;
    });

    if (!filtered.length) {
      listEl.innerHTML = `<p class="muted">${I18N.t('noTasks')}</p>`;
      return;
    }
    const isAdmin = !!(state.me && state.me.isAdmin);
    listEl.innerHTML = '';
    filtered.forEach((t) => listEl.appendChild(renderTaskCard(t, isAdmin)));
    attachTaskHandlers(listEl);
  }

  document.getElementById('taskSearchInput').addEventListener('input', renderFilteredTasks);
  document.querySelectorAll('#platformChips .chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#platformChips .chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      state.activePlatformFilter = chip.dataset.filter;
      renderFilteredTasks();
    });
  });

  // ================= Add Task (admin, free) =================
  function renderActionSwitcher(containerId, platform, onSelect) {
    const container = document.getElementById(containerId);
    const actions = PLATFORM_ACTIONS[platform] || [];
    container.innerHTML = actions
      .map((a, i) => `<button class="platform-opt${i === 0 ? ' active' : ''}" data-action="${a}">${I18N.t('action_' + a) || a}</button>`)
      .join('');
    if (actions.length) onSelect(actions[0]);
    container.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('[data-action]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        onSelect(btn.dataset.action);
      });
    });
  }

  document.getElementById('addTaskFab').addEventListener('click', () => {
    renderActionSwitcher('actionSwitcher', state.selectedPlatform, (a) => (state.selectedAction = a));
    document.getElementById('addTaskModal').classList.remove('hidden');
  });
  document.querySelectorAll('#platformSwitcher .platform-opt').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#platformSwitcher .platform-opt').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.selectedPlatform = btn.dataset.platform;
      renderActionSwitcher('actionSwitcher', state.selectedPlatform, (a) => (state.selectedAction = a));
    });
  });
  document.getElementById('submitTaskBtn').addEventListener('click', async () => {
    const title = document.getElementById('taskTitleInput').value.trim();
    const url = document.getElementById('taskUrlInput').value.trim();
    const rewardUSDT = document.getElementById('taskRewardInput').value;
    if (!title || !url) return showToast(I18N.t('fillAllFields'));
    try {
      await api('/tasks', {
        method: 'POST',
        body: { title, url, platform: state.selectedPlatform, actionType: state.selectedAction, rewardUSDT },
      });
      showToast(I18N.t('taskAdded'));
      document.getElementById('addTaskModal').classList.add('hidden');
      document.getElementById('taskTitleInput').value = '';
      document.getElementById('taskUrlInput').value = '';
      document.getElementById('taskRewardInput').value = 0.01;
      loadTasks();
    } catch (e) { showToast(e.message); }
  });

  // ================= User Task Request (fixed payment) =================
  document.getElementById('userAddTaskFab').addEventListener('click', async () => {
    try {
      const info = await api('/tasks/payment-info');
      document.getElementById('payNetwork').textContent = info.network;
      document.getElementById('payAddress').textContent = info.address;
      document.getElementById('postTaskDescText').textContent = I18N.t('postTaskDesc').replace('{amount}', info.amountUSDT);
    } catch (e) {}
    document.getElementById('userTaskModal').classList.remove('hidden');
  });
  document.querySelectorAll('#userPlatformSwitcher .platform-opt').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#userPlatformSwitcher .platform-opt').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.userSelectedPlatform = btn.dataset.platform;
    });
  });
  document.getElementById('copyPayAddressBtn').addEventListener('click', () => {
    const addr = document.getElementById('payAddress').textContent;
    navigator.clipboard?.writeText(addr).catch(() => {});
    showToast(I18N.t('linkCopied'));
  });
  document.getElementById('submitUserTaskBtn').addEventListener('click', async () => {
    const title = document.getElementById('userTaskTitleInput').value.trim();
    const url = document.getElementById('userTaskUrlInput').value.trim();
    if (!title || !url) return showToast(I18N.t('fillAllFields'));
    try {
      await api('/tasks/requests', { method: 'POST', body: { title, url, platform: state.userSelectedPlatform } });
      showToast(I18N.t('taskSubmitted'));
      document.getElementById('userTaskModal').classList.add('hidden');
      document.getElementById('userTaskTitleInput').value = '';
      document.getElementById('userTaskUrlInput').value = '';
    } catch (e) { showToast(e.message); }
  });

  // ================= Admin: Pending Task Requests =================
  async function refreshPendingRequestsCount() {
    try {
      const { requests } = await api('/tasks/requests/pending');
      document.getElementById('pendingRequestsCount').textContent = requests.length;
    } catch (e) {}
  }
  document.getElementById('pendingRequestsBtn').addEventListener('click', async () => {
    const listEl = document.getElementById('pendingRequestsList');
    listEl.innerHTML = `<p class="muted">${I18N.t('loading')}</p>`;
    document.getElementById('pendingRequestsModal').classList.remove('hidden');
    try {
      const { requests } = await api('/tasks/requests/pending');
      if (!requests.length) { listEl.innerHTML = `<p class="muted">${I18N.t('noPendingTasks')}</p>`; return; }
      listEl.innerHTML = '';
      requests.forEach((r) => {
        const div = document.createElement('div');
        div.className = 'pending-task-item';
        div.innerHTML = `
          <h4>${escapeHtml(r.title)}</h4>
          <p>${r.platform} · <a href="${r.url}" target="_blank" style="color:var(--accent-3)">${escapeHtml(r.url)}</a></p>
          <p>Sponsor: ${r.sponsorTelegramId}</p>
          <div class="pending-task-actions">
            <button class="approve-btn" data-handle="${r.id}">✅ ${I18N.t('paymentReceived')}</button>
            <button class="reject-btn" data-rejectreq="${r.id}">❌ ${I18N.t('reject')}</button>
          </div>
        `;
        listEl.appendChild(div);
      });
      listEl.querySelectorAll('[data-handle]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          try {
            await api(`/tasks/requests/${btn.dataset.handle}/handle`, { method: 'POST' });
            showToast('✅');
            document.getElementById('pendingRequestsBtn').click();
            refreshPendingRequestsCount();
          } catch (e) { showToast(e.message); }
        });
      });
      listEl.querySelectorAll('[data-rejectreq]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          try {
            await api(`/tasks/requests/${btn.dataset.rejectreq}/reject`, { method: 'POST' });
            showToast('🗑');
            document.getElementById('pendingRequestsBtn').click();
            refreshPendingRequestsCount();
          } catch (e) { showToast(e.message); }
        });
      });
    } catch (e) {
      listEl.innerHTML = `<p class="muted">${e.message}</p>`;
    }
  });

  // ================= Admin: Pending Verifications =================
  async function refreshPendingVerifyCount() {
    try {
      const { verifications } = await api('/tasks/verifications');
      document.getElementById('pendingVerifyCount').textContent = verifications.length;
    } catch (e) {}
  }
  document.getElementById('pendingVerifyBtn').addEventListener('click', async () => {
    const listEl = document.getElementById('pendingVerifyList');
    listEl.innerHTML = `<p class="muted">${I18N.t('loading')}</p>`;
    document.getElementById('pendingVerifyModal').classList.remove('hidden');
    try {
      const { verifications } = await api('/tasks/verifications');
      if (!verifications.length) { listEl.innerHTML = `<p class="muted">${I18N.t('noPendingTasks')}</p>`; return; }
      listEl.innerHTML = '';
      verifications.forEach((v) => {
        const div = document.createElement('div');
        div.className = 'pending-task-item';
        div.innerHTML = `
          <h4>${escapeHtml(v.taskTitle)}</h4>
          <p>${v.platform} · ${I18N.t('action_' + v.actionType) || v.actionType} · +💵${fmtUsdt(v.rewardUSDT)} USDT</p>
          <p>${I18N.t('submittedUsername')}: <small class="username">${escapeHtml(v.submittedUsername)}</small></p>
          <p>User: ${v.userId}</p>
          <div class="pending-task-actions">
            <button class="approve-btn" data-approvev="${v.id}">✅ ${I18N.t('approve')}</button>
            <button class="reject-btn" data-rejectv="${v.id}">❌ ${I18N.t('reject')}</button>
          </div>
        `;
        listEl.appendChild(div);
      });
      listEl.querySelectorAll('[data-approvev]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          try {
            await api(`/tasks/verifications/${btn.dataset.approvev}/approve`, { method: 'POST' });
            showToast('✅');
            document.getElementById('pendingVerifyBtn').click();
            refreshPendingVerifyCount();
          } catch (e) { showToast(e.message); }
        });
      });
      listEl.querySelectorAll('[data-rejectv]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          try {
            await api(`/tasks/verifications/${btn.dataset.rejectv}/reject`, { method: 'POST' });
            showToast('🗑');
            document.getElementById('pendingVerifyBtn').click();
            refreshPendingVerifyCount();
          } catch (e) { showToast(e.message); }
        });
      });
    } catch (e) {
      listEl.innerHTML = `<p class="muted">${e.message}</p>`;
    }
  });

  // ================= Ad watch + history + admin edit =================
  async function loadAdHistory() {
    const listEl = document.getElementById('adHistoryList');
    try {
      const list = await api('/ads/history');
      if (!list.length) { listEl.innerHTML = `<div class="ad-history-empty">${I18N.t('noAdHistory')}</div>`; return; }
      listEl.innerHTML = list
        .map((a) => `<div class="ad-history-row"><span class="amount">+💵${fmtUsdt(a.amountUSDT)} USDT</span><span class="time">${new Date(a.watchedAt).toLocaleString()}</span></div>`)
        .join('');
    } catch (e) {}
  }

  document.getElementById('editAdRewardBtn').addEventListener('click', async () => {
    const current = document.getElementById('adRewardText').textContent;
    const val = window.prompt(I18N.t('editAdRewardPrompt'), current);
    if (val === null) return;
    const amount = Number(val);
    if (!amount || amount <= 0) return showToast(I18N.t('fillAllFields'));
    try {
      const result = await api('/ads/reward', { method: 'POST', body: { amountUSDT: amount } });
      document.getElementById('adRewardText').textContent = fmtUsdt(result.adRewardUSDT);
      showToast('✅');
    } catch (e) { showToast(e.message); }
  });

  async function watchAdFlow() {
    try {
      if (typeof window.show_11539401 === 'function') {
        await window.show_11539401();
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1500));
    }
      const result = await api('/ads/watch', { method: 'POST' });
      document.getElementById('usdtBalance').textContent = Number(result.balanceUSDT).toFixed(3);
      showRewardPopup(result.rewardedUSDT);
      loadAdHistory();
    } catch (e) {
      showToast(e.message || I18N.t('adCooldownMsg'));
    }
  }
  document.getElementById('watchAdBtn').addEventListener('click', watchAdFlow);
  document.getElementById('watchAdHomeBtn').addEventListener('click', () => { navigate('tasks'); watchAdFlow(); });

  // ================= Rank / Friends =================
  document.getElementById('copyLinkBtn').addEventListener('click', () => {
    const input = document.getElementById('referralLinkInput');
    input.select();
    navigator.clipboard?.writeText(input.value).catch(() => document.execCommand('copy'));
    showToast(I18N.t('linkCopied'));
  });
  document.getElementById('shareLinkBtn').addEventListener('click', () => {
    const link = document.getElementById('referralLinkInput').value;
    const shareText = '🚀 Join ZORY X BOT and start earning USDT today! Complete simple tasks, invite friends, and climb the leaderboard 🏆';
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareText)}`;
    if (tg && tg.openTelegramLink) tg.openTelegramLink(shareUrl);
    else window.open(shareUrl, '_blank');
  });

  async function loadStats() {
    try {
      const s = await api('/stats');
      document.getElementById('statTasks').textContent = s.totalTasks.toLocaleString();
      document.getElementById('statRewards').textContent = '$' + s.totalRewardsUSD.toLocaleString();
      document.getElementById('statUsers').textContent = s.totalUsers.toLocaleString();
      document.getElementById('statDays').textContent = s.runningDays + 'D';
    } catch (e) {}
    if (state.me) {
      document.getElementById('referralLinkInput').value = state.me.referralLink;
    }
  }

  document.querySelectorAll('.tab-row [data-lb]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-row [data-lb]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeLbTab = btn.dataset.lb;
      loadLeaderboard();
    });
  });

  function startWeeklyCountdown() {
    clearInterval(state.weeklyTimerInterval);
    const el = document.getElementById('weeklyCountdown');
    if (state.activeLbTab !== 'weekly') { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    function tick() {
      const now = new Date();
      const day = now.getUTCDay();
      const daysUntilMonday = (8 - day) % 7 || 7;
      const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilMonday));
      const diff = next.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000) % 24;
      const d = Math.floor(diff / 86400000);
      const m = Math.floor(diff / 60000) % 60;
      const s = Math.floor(diff / 1000) % 60;
      document.getElementById('weeklyTimer').textContent = `${d}d ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    tick();
    state.weeklyTimerInterval = setInterval(tick, 1000);
  }

  async function loadLeaderboard() {
    const listEl = document.getElementById('leaderboardList');
    listEl.innerHTML = `<p class="muted">${I18N.t('loading')}</p>`;
    startWeeklyCountdown();
    const rows = await api(`/leaderboard?type=${state.activeLbTab}`);
    listEl.innerHTML = '';
    const unit = state.activeLbTab === 'invites' ? '' : ' USDT';
    const prefix = state.activeLbTab === 'invites' ? '' : '💵';
    rows.forEach((r) => {
      const row = document.createElement('div');
      row.className = 'lb-row' + (r.isYou ? ' you' : '');
      const rankClass = r.rank === 1 ? 'top1' : r.rank === 2 ? 'top2' : r.rank === 3 ? 'top3' : '';
      const medal = r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : r.rank;
      const value = state.activeLbTab === 'invites' ? r.value : fmtUsdt(r.value);
      row.innerHTML = `
        <div class="lb-rank ${rankClass}">${medal}</div>
        <img class="lb-avatar" src="${r.photoUrl || 'https://api.dicebear.com/7.x/identicon/svg?seed=' + r.name}" />
        <div class="lb-name">${escapeHtml(r.name)}</div>
        <div class="lb-coins">${prefix}${value}${unit}</div>
      `;
      listEl.appendChild(row);
    });
  }

  // ================= Activity: Achievements =================
  document.querySelectorAll('#page-activity .tab-row [data-activity]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#page-activity .tab-row [data-activity]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.activity-tab').forEach((t) => t.classList.remove('active'));
      document.getElementById(`activity-${btn.dataset.activity}`).classList.add('active');
    });
  });
  document.querySelectorAll('.sub-tab-row .sub-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sub-tab-row .sub-tab').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeActivityCat = btn.dataset.cat;
      renderAchievements();
    });
  });

  let cachedAchievements = [];
  async function loadAchievements() {
    const data = await api('/achievements');
    cachedAchievements = data.achievements;
    document.getElementById('achDone').textContent = data.completedCount;
    document.getElementById('achTotal').textContent = data.totalCount;
    renderAchievements();
  }
  function renderAchievements() {
    const listEl = document.getElementById('achievementList');
    const filtered = cachedAchievements.filter((a) => a.category === state.activeActivityCat);
    listEl.innerHTML = '';
    filtered.forEach((a) => {
      const pct = Math.min(100, Math.round((a.progress / a.target) * 100));
      const div = document.createElement('div');
      div.className = 'achievement-card';
      const btnLabel = a.claimed ? '✔ ' + I18N.t('claimed') : a.claimable ? I18N.t('claim') : `${a.progress}/${a.target}`;
      div.innerHTML = `
        <div class="ach-top">
          <span class="ach-icon">${a.icon}</span>
          <div class="ach-text"><strong>${I18N.t(a.titleKey)}</strong><small>${I18N.t(a.descKey)}</small></div>
          <span class="ach-reward">+💵${fmtUsdt(a.rewardUSDT)} USDT</span>
        </div>
        <div class="ach-progress-bar"><div class="ach-progress-fill" style="width:${pct}%"></div></div>
        <div class="ach-bottom">
          <span class="muted small">${a.progress}/${a.target}</span>
          <button class="ach-claim-btn" data-claim="${a.id}" ${a.claimable ? '' : 'disabled'}>${btnLabel}</button>
        </div>
      `;
      listEl.appendChild(div);
    });
    listEl.querySelectorAll('[data-claim]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          const result = await api('/achievements/claim', { method: 'POST', body: { achievementId: btn.dataset.claim } });
          showRewardPopup(result.rewardedUSDT);
          document.getElementById('usdtBalance').textContent = Number(result.balanceUSDT).toFixed(3);
          loadAchievements();
        } catch (e) { showToast(e.message); }
      });
    });
  }

  // ================= Activity: Events =================
  async function loadEvents() {
    const listEl = document.getElementById('eventsList');
    const emptyEl = document.getElementById('eventsEmptyState');
    try {
      const events = await api('/events');
      if (!events.length) {
        listEl.innerHTML = '';
        emptyEl.classList.remove('hidden');
        return;
      }
      emptyEl.classList.add('hidden');
      const isAdmin = !!(state.me && state.me.isAdmin);
      listEl.innerHTML = events
        .map(
          (e) => `
        <div class="event-card">
          ${isAdmin ? `<button class="event-delete-btn" data-delevent="${e.id}">🗑</button>` : ''}
          ${e.imageUrl ? `<img class="event-img" src="${e.imageUrl}" alt="" />` : ''}
          <h4>${escapeHtml(e.title)}</h4>
          <p>${escapeHtml(e.description || '')}</p>
          ${e.link ? `<a class="event-link" href="${e.link}" target="_blank">🔗 ${I18N.t('openLink')}</a>` : ''}
        </div>`
        )
        .join('');
      listEl.querySelectorAll('[data-delevent]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          try {
            await api(`/events/${btn.dataset.delevent}`, { method: 'DELETE' });
            loadEvents();
          } catch (e2) { showToast(e2.message); }
        });
      });
    } catch (e) {}
  }

  document.getElementById('createEventFab').addEventListener('click', () => {
    document.getElementById('createEventModal').classList.remove('hidden');
  });
  document.getElementById('submitEventBtn').addEventListener('click', async () => {
    const title = document.getElementById('eventTitleInput').value.trim();
    const description = document.getElementById('eventDescInput').value.trim();
    const link = document.getElementById('eventLinkInput').value.trim();
    if (!title) return showToast(I18N.t('fillAllFields'));
    try {
      let imageUrl = (document.getElementById('eventImageInput') || {}).value || '';
      const fileEl = document.getElementById('eventImageFile');
      if (fileEl && fileEl.files && fileEl.files[0]) {
        imageUrl = await new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result);
          r.onerror = reject;
          r.readAsDataURL(fileEl.files[0]);
        });
      }
      await api('/events', { method: 'POST', body: { title, description, link, imageUrl } });
      showToast('✅');
      document.getElementById('createEventModal').classList.add('hidden');
      document.getElementById('eventTitleInput').value = '';
      document.getElementById('eventDescInput').value = '';
      document.getElementById('eventLinkInput').value = '';
      if (document.getElementById('eventImageInput')) document.getElementById('eventImageInput').value = '';
      if (fileEl) fileEl.value = '';
      loadEvents();
    } catch (e) { showToast(e.message); }
  });

  // ================= Withdraw =================
  async function openWithdrawModal() {
    try {
      if (!state.walletConnected) {
        showPremiumNotif('Connect Wallet', 'Please connect your wallet first before withdrawing.', 'warn');
        openDepositModal();
        return;
      }
      const info = await api('/withdraw/info');
      if (!info.hasDeposited) {
        showPremiumNotif(
          'Withdraw fee required',
          I18N.t('depositRequired') || 'Pay 1 USDT fee from your connected wallet to unlock withdrawals.',
          'warn'
        );
        openDepositModal();
        return;
      }
      document.getElementById('withdrawModal').classList.remove('hidden');
      document.getElementById('wdBalance').textContent = info.withdrawableUSDT.toFixed(3);
      document.getElementById('wdMin').textContent = `${info.minUSDT} USDT`;
      document.getElementById('wdAmountInput').dataset.max = info.withdrawableUSDT;
    } catch (e) {
      showToast(e.message || 'Error');
    }
  }
  document.getElementById('openWithdrawBtn').addEventListener('click', openWithdrawModal);
  document.querySelectorAll('.tab-row [data-wtab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#withdrawModal .tab-row [data-wtab]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.withdraw-tab').forEach((t) => t.classList.remove('active'));
      document.getElementById(`withdrawTab-${btn.dataset.wtab}`).classList.add('active');
      if (btn.dataset.wtab === 'history') loadWithdrawHistory();
    });
  });
  document.getElementById('wdMaxBtn').addEventListener('click', () => {
    const max = document.getElementById('wdAmountInput').dataset.max || '0';
    document.getElementById('wdAmountInput').value = max;
    document.getElementById('wdArrival').textContent = `${Number(max).toFixed(3)} USDT`;
  });
  document.getElementById('wdAmountInput').addEventListener('input', (e) => {
    const val = Number(e.target.value) || 0;
    document.getElementById('wdArrival').textContent = `${val.toFixed(3)} USDT`;
  });
  document.getElementById('submitWithdrawBtn').addEventListener('click', async () => {
    const amountUSDT = document.getElementById('wdAmountInput').value;
    const recipientAddress = document.getElementById('wdAddressInput').value.trim();
    try {
      const result = await api('/withdraw', { method: 'POST', body: { amountUSDT, recipientAddress } });
      showToast(I18N.t('withdrawSubmitted'));
      document.getElementById('usdtBalance').textContent = Number(result.balanceUSDT).toFixed(3);
      document.getElementById('walletUSDT').textContent = Number(result.balanceUSDT).toFixed(3);
      document.getElementById('wdAmountInput').value = '';
      document.getElementById('wdAddressInput').value = '';
      openWithdrawModal();
    } catch (e) {
      const msg = e.message || '';
      if (msg.includes('deposit_required') || msg.includes('must deposit')) {
        showToast(I18N.t('depositRequired') || 'Deposit at least 1 USDT before withdrawing');
        openDepositModal();
      } else showToast(msg);
    }
  });
  async function loadWithdrawHistory() {
    const listEl = document.getElementById('withdrawHistoryList');
    listEl.innerHTML = `<p class="muted">${I18N.t('loading')}</p>`;
    const list = await api('/withdraw/history');
    if (!list.length) { listEl.innerHTML = `<p class="muted">${I18N.t('noWithdrawals')}</p>`; return; }
    listEl.innerHTML = '';
    list.forEach((w) => {
      const div = document.createElement('div');
      div.className = 'wh-item';
      div.innerHTML = `
        <div><strong>${w.amountUSDT} USDT</strong><br/><small class="muted">${new Date(w.createdAt).toLocaleDateString()}</small></div>
        <span class="wh-status ${w.status}">${w.status.toUpperCase()}</span>
      `;
      listEl.appendChild(div);
    });
  }

  // ================= Live balance sync (real users only; fake accounts are static) =================
  function startBalancePolling() {
    setInterval(async () => {
      try {
        const { balanceUSDT } = await api('/balance');
        const formatted = Number(balanceUSDT).toFixed(3);
        document.getElementById('usdtBalance').textContent = formatted;
        document.getElementById('walletUSDT').textContent = formatted;
        // keep the withdraw modal's balance live too, without touching whatever the user is typing
        const withdrawModal = document.getElementById('withdrawModal');
        if (!withdrawModal.classList.contains('hidden')) {
          document.getElementById('wdBalance').textContent = formatted;
          document.getElementById('wdAmountInput').dataset.max = balanceUSDT;
        }
        if (state.me) state.me.balanceUSDT = balanceUSDT;
      } catch (e) {
        /* silent - a missed poll just tries again next tick */
      }
    }, 6000);
  }


  // ================= Connect Wallet + Deposit (inside app scope) =================
  state.walletConnected = false;
  state.walletAddress = null;
  state.tonConnectUI = null;
  state.depositAddresses = { tonkeeper: '', defi: '' };

  function shortAddr(a) {
    if (!a || a.length < 12) return a || '';
    return a.slice(0, 6) + '…' + a.slice(-6);
  }

  function updateWalletBtn() {
    const btn = document.getElementById('walletBtn');
    if (btn) {
      if (state.walletConnected) {
        btn.textContent = 'Disconnect';
        btn.classList.add('connected');
      } else {
        btn.textContent = '🔗 Connect Wallet';
        btn.classList.remove('connected');
      }
    }
    const modalBtn = document.getElementById('modalWalletBtn');
    const addrEl = document.getElementById('userWalletAddr');
    if (modalBtn) {
      if (state.walletConnected) {
        modalBtn.textContent = 'Disconnect';
        modalBtn.classList.add('connected');
      } else {
        modalBtn.textContent = '🔗 Connect Wallet';
        modalBtn.classList.remove('connected');
      }
    }
    if (addrEl) {
      addrEl.textContent = state.walletConnected && state.walletAddress
        ? state.walletAddress
        : 'Not connected';
    }
  }

  function getTonConnectUIClass() {
    // unpkg UMD builds expose different globals depending on version
    if (window.TON_CONNECT_UI && window.TON_CONNECT_UI.TonConnectUI) {
      return window.TON_CONNECT_UI.TonConnectUI;
    }
    if (typeof window.TonConnectUI === 'function') return window.TonConnectUI;
    if (window.TonConnect && window.TonConnect.TonConnectUI) return window.TonConnect.TonConnectUI;
    return null;
  }

  function initTonConnect() {
    if (state.tonConnectUI) return state.tonConnectUI;
    try {
      const TonConnectUI = getTonConnectUIClass();
      if (!TonConnectUI) {
        console.warn('TonConnectUI library not loaded');
        return null;
      }
      const manifestUrl = window.location.origin + '/tonconnect-manifest.json';
      state.tonConnectUI = new TonConnectUI({ manifestUrl: manifestUrl });
      state.tonConnectUI.onStatusChange(function (w) {
        state.walletConnected = !!(w && w.account);
        state.walletAddress = w && w.account ? w.account.address : null;
        updateWalletBtn();
      });
      return state.tonConnectUI;
    } catch (e) {
      console.warn('TON Connect init error', e);
      return null;
    }
  }

  async function toggleWallet() {
    try {
      if (state.walletConnected && state.tonConnectUI) {
        try { await state.tonConnectUI.disconnect(); } catch (e) {}
        state.walletConnected = false;
        state.walletAddress = null;
        updateWalletBtn();
        showToast((I18N.t && I18N.t('walletDisconnected')) || 'Wallet disconnected');
        return;
      }
      var ui = state.tonConnectUI || initTonConnect();
      if (ui) {
        try {
          await ui.openModal();
        } catch (e) {
          console.warn(e);
          showToast(e.message || 'Connect failed');
          openDepositModal();
        }
      } else {
        // Library missing / blocked — still open deposit so user can pay manually
        openDepositModal();
        showToast((I18N.t && I18N.t('connectWalletHint')) || 'Send 1 USDT via Tonkeeper');
      }
    } catch (err) {
      console.error('toggleWallet', err);
      showToast(err.message || 'Wallet error');
      openDepositModal();
    }
  }

  function updateDepositWithdrawUI(hasDeposited) {
    var depBtn = document.getElementById('openDepositBtn');
    var wdBtn = document.getElementById('openWithdrawBtn');
    var sendBtn = document.getElementById('sendDepositBtn');
    if (hasDeposited) {
      if (depBtn) depBtn.classList.add('hidden');
      if (wdBtn) wdBtn.classList.remove('hidden');
      if (sendBtn) sendBtn.classList.add('hidden');
      var modal = document.getElementById('depositModal');
      if (modal) modal.classList.add('hidden');
    } else {
      if (depBtn) depBtn.classList.remove('hidden');
      if (wdBtn) wdBtn.classList.add('hidden');
      if (sendBtn) sendBtn.classList.remove('hidden');
    }
  }

  async function openDepositModal() {
    if (state.me && state.me.hasDeposited) {
      showPremiumNotif('Unlocked', 'Deposit already complete. You can withdraw.', 'ok');
      updateDepositWithdrawUI(true);
      var wm = document.getElementById('withdrawModal');
      if (wm) wm.classList.remove('hidden');
      return;
    }
    var modal = document.getElementById('depositModal');
    if (!modal) {
      showToast('Deposit UI missing');
      return;
    }
    modal.classList.remove('hidden');
    updateWalletBtn();
    try {
      var info = await api('/deposit/info');
      state.depositAddresses.tonkeeper = info.depositAddressTonkeeper || '';
      state.depositAddresses.defi = info.depositAddressDefi || '';
      if (info.hasDeposited) {
        if (state.me) state.me.hasDeposited = true;
        updateDepositWithdrawUI(true);
        modal.classList.add('hidden');
        return;
      }
      var tk = document.getElementById('depAddrTk');
      var df = document.getElementById('depAddrDefi');
      if (tk) tk.textContent = state.depositAddresses.tonkeeper;
      if (df) df.textContent = state.depositAddresses.defi;
    } catch (e) {
      console.warn(e);
    }
  }

  /** Deposit 1 USDT — opens connected wallet with amount + our address */
  async function depositOneUsdt() {
    if (!state.walletConnected || !state.tonConnectUI) {
      showPremiumNotif('Connect Wallet', (I18N.t && I18N.t('connectWalletFirst')) || 'Connect Wallet first', 'warn');
      await toggleWallet();
      // if still not connected, stop
      if (!state.walletConnected) return;
    }
    var to = state.depositAddresses.tonkeeper || state.depositAddresses.defi;
    if (!to) {
      try {
        var info = await api('/deposit/info');
        state.depositAddresses.tonkeeper = info.depositAddressTonkeeper || '';
        state.depositAddresses.defi = info.depositAddressDefi || '';
        to = state.depositAddresses.tonkeeper || state.depositAddresses.defi;
      } catch (e) {}
    }
    if (!to) {
      showToast('Deposit address missing');
      return;
    }

    // USDT on TON (mainnet jetton master), 6 decimals → 1 USDT = 1000000
    var USDT_JETTON = 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs';
    var amountUnits = '1000000';

    showPremiumNotif('Deposit 1 USDT', 'Opening wallet — confirm 1 USDT…', 'info');

    var deep =
      'https://app.tonkeeper.com/transfer/' +
      encodeURIComponent(to) +
      '?jetton=' + encodeURIComponent(USDT_JETTON) +
      '&amount=' + amountUnits +
      '&text=' + encodeURIComponent('ZORY X BOT deposit fee');

    try {
      if (window.Telegram && Telegram.WebApp && Telegram.WebApp.openLink) {
        Telegram.WebApp.openLink(deep);
      } else {
        window.open(deep, '_blank');
      }
    } catch (e) {
      console.warn(e);
      try {
        window.location.href = 'ton://transfer/' + to + '?jetton=' + USDT_JETTON + '&amount=' + amountUnits;
      } catch (e2) {}
    }

    // Auto submit deposit request for admin approval queue
    try {
      await api('/deposit', {
        method: 'POST',
        body: {
          amountUSDT: 1,
          txHash: '',
          fromWallet: state.walletAddress || '',
        },
      });
      showPremiumNotif(
        'Request sent',
        'Confirm 1 USDT in your wallet. After admin approval, Withdraw will appear.',
        'ok'
      );
      document.getElementById('depositModal').classList.add('hidden');
    } catch (e) {
      showToast(e.message || 'Deposit request failed');
    }
  }

  function bindWalletUI() {
    var wb = document.getElementById('walletBtn');
    if (wb) {
      wb.addEventListener('click', function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        toggleWallet();
      });
    }
    var send = document.getElementById('sendDepositBtn');
    if (send) send.addEventListener('click', function () { depositOneUsdt(); });
    var mwb = document.getElementById('modalWalletBtn');
    if (mwb) mwb.addEventListener('click', function () { toggleWallet(); });
    var openDep = document.getElementById('openDepositBtn');
    if (openDep) openDep.addEventListener('click', function () { openDepositModal(); });
    document.querySelectorAll('.copy-addr').forEach(function (b) {
      b.addEventListener('click', async function () {
        var id = b.getAttribute('data-copy');
        var el = document.getElementById(id);
        if (!el) return;
        try {
          await navigator.clipboard.writeText(el.textContent.trim());
          showToast('Copied');
        } catch (e) {
          showToast(el.textContent.trim());
        }
      });
    });
    document.querySelectorAll('[data-close="depositModal"]').forEach(function (b) {
      b.addEventListener('click', function () {
        document.getElementById('depositModal').classList.add('hidden');
      });
    });
  }

  // ================= Boot =================
  (async function init() {
    try {
      await I18N.load('bn');
      await loadMe();
      tickTicker();
      await loadStats();
      startBalancePolling();
    } catch (e) {
      console.error(e);
      showToast('Failed to load. Please reopen the app.');
    } finally {
      document.getElementById('loadingScreen').classList.add('fade-out');
      document.getElementById('app').classList.remove('hidden');
      setTimeout(function () {
        var ls = document.getElementById('loadingScreen');
        if (ls) ls.remove();
      }, 500);
      // Wallet after UI visible + script loaded
      bindWalletUI();
      setTimeout(initTonConnect, 300);
    }
  })();
})();
