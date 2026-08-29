(() => {
  const root = document.getElementById("app");
  const state = {
    user: null,
    page: "login",
    roomId: null,
    rooms: [],
    room: null,
    messages: [],
    gifts: [],
    history: [],
    target: null,
    micOn: false,
    stream: null,
    speaking: false,
    mode: "in",
    err: "",
    fly: null,
    socket: null,
    createOpen: false,
    cfg: null,
    otpSent: false,
    phoneDraft: "",
    confirmation: null,
  };

  function avatarStyle(hue) {
    return `background:linear-gradient(145deg,hsl(${hue} 70% 42%),hsl(${(hue + 40) % 360} 55% 22%))`;
  }

  function langToggle() {
    const lang = getLang();
    return `<div class="lang-toggle">
      <button type="button" class="${lang === "bn" ? "on" : ""}" data-act="lang" data-v="bn">বাং</button>
      <button type="button" class="${lang === "en" ? "on" : ""}" data-act="lang" data-v="en">EN</button>
    </div>`;
  }

  function nav() {
    const p = state.page;
    return `<nav class="nav">
      <button class="${p === "home" ? "active" : ""}" data-act="nav" data-v="home">🏠<span>${t("home")}</span></button>
      <button class="${p === "rooms" ? "active" : ""}" data-act="nav" data-v="rooms">🎙️<span>${t("rooms")}</span></button>
      <button class="${p === "wallet" ? "active" : ""}" data-act="nav" data-v="wallet">🎁<span>${t("wallet")}</span></button>
      <button class="${p === "profile" ? "active" : ""}" data-act="nav" data-v="profile">👤<span>${t("profile")}</span></button>
    </nav>`;
  }

  const G_MARK = `<svg class="g-mark" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.8-6.6 7.4l6.3 5.3C37.8 38.3 44 32.5 44 24c0-1.2-.1-2.3-.4-3.5z"/></svg>`;

  function renderLogin() {
    const cfg = state.cfg || {};
    const hasGoogle = Boolean(cfg.googleClientId);
    return `<main class="screen login-hero">
      <div class="blob a"></div><div class="blob b"></div>
      <div class="space">
        <div>
          <div class="brand">GF BF</div>
          <p class="muted">${t("tagline")}</p>
        </div>
        ${langToggle()}
      </div>
      <div class="stack mt-6">
        ${hasGoogle
          ? `<div id="google-btn-host" class="google-host"></div>`
          : `<button class="btn btn-google btn-block" type="button" data-act="google">${G_MARK}${t("continueGoogle")}</button>`}
        <div class="auth-divider"><span>${t("orPhone")}</span></div>
        <input id="phone" type="tel" inputmode="tel" placeholder="${t("phonePlaceholder")}" autocomplete="tel" value="${escapeAttr(state.phoneDraft || "")}" />
        ${state.otpSent ? `<input id="otp" type="text" inputmode="numeric" maxlength="6" placeholder="${t("otp")}" autocomplete="one-time-code" />` : ""}
        ${state.otpSent
          ? `<button class="btn btn-phone btn-block" type="button" data-act="verify-otp">${t("verifyOtp")}</button>
             <button class="btn btn-ghost btn-block" type="button" data-act="send-otp">${t("resendOtp")}</button>`
          : `<button class="btn btn-phone btn-block" type="button" data-act="send-otp">${t("sendOtp")}</button>`}
        <div class="auth-divider"><span>${t("orEmail")}</span></div>
        ${state.mode === "up" ? `<input id="name" placeholder="${t("name")}" />` : ""}
        <input id="email" type="email" placeholder="${t("email")}" autocomplete="email" />
        <input id="password" type="password" placeholder="${t("password")}" autocomplete="${state.mode === "up" ? "new-password" : "current-password"}" />
        ${state.err ? `<p class="err">${state.err}</p>` : ""}
        <button class="btn btn-primary btn-block" data-act="auth-submit">${state.mode === "up" ? t("signUp") : t("signIn")}</button>
        <button class="btn btn-ghost btn-block" data-act="toggle-mode">${state.mode === "up" ? t("haveAccount") + " " + t("signIn") : t("noAccount") + " " + t("signUp")}</button>
      </div>
    </main>`;
  }

  function renderHome() {
    const u = state.user;
    const rooms = state.rooms || [];
    return `<main class="screen">
      <div class="space">
        <div>
          <div class="tag">Live party</div>
          <div class="brand">GF BF</div>
        </div>
        ${langToggle()}
      </div>
      <div class="card mt-4">
        <div class="muted" style="font-size:13px">${t("welcome")}</div>
        <div style="font-size:18px;font-weight:600">${u?.displayName || "Star"}</div>
        <div class="row mt-2" style="font-size:13px;gap:16px">
          <span><strong style="color:var(--gold)">${u?.coins ?? 0}</strong> ${t("coins")}</span>
          <span><strong style="color:var(--primary)">${u?.charm ?? 0}</strong> ${t("charm")}</span>
        </div>
      </div>
      <div class="space mt-6">
        <h2 class="h2" style="margin:0">${t("liveNow")}</h2>
        <button class="btn btn-primary" data-act="open-create">＋ ${t("createRoom")}</button>
      </div>
      <div class="stack mt-3">
        ${!rooms.length ? `<div class="card muted">${t("emptyRooms")}</div>` : ""}
        ${rooms
          .map(
            (r) => `<button class="room-card" data-act="enter" data-id="${r.id}">
            <div class="space">
              <div>
                <div style="font-weight:600">${escapeHtml(r.title)}</div>
                <div class="muted" style="font-size:12px">${escapeHtml(r.topic || "")}</div>
              </div>
              <span class="badge-live">LIVE</span>
            </div>
            <div class="muted mt-2" style="font-size:12px">${r.people} ${t("listeners")} · ${r.speakers} ${t("speaker")}</div>
          </button>`
          )
          .join("")}
      </div>
      ${state.createOpen ? createSheet() : ""}
      ${nav()}
    </main>`;
  }

  function createSheet() {
    return `<div class="sheet"><div class="sheet-panel stack">
      <div class="h1">${t("createRoom")}</div>
      <input id="roomTitle" placeholder="${t("roomTitle")}" />
      <input id="roomTopic" placeholder="${t("topic")}" />
      ${state.err ? `<p class="err">${state.err}</p>` : ""}
      <div class="row">
        <button class="btn btn-ghost" style="flex:1" data-act="close-create">${t("close")}</button>
        <button class="btn btn-primary" style="flex:1" data-act="create-room">${t("start")}</button>
      </div>
    </div></div>`;
  }

  function renderRooms() {
    const rooms = state.rooms || [];
    return `<main class="screen">
      <h1 class="h1">${t("rooms")}</h1>
      <div class="stack mt-4">
        ${rooms
          .map(
            (r) => `<button class="room-card space" data-act="enter" data-id="${r.id}">
            <div>
              <div style="font-weight:600">${escapeHtml(r.title)}</div>
              <div class="muted" style="font-size:12px">${escapeHtml(r.topic || "")}</div>
            </div>
            <span class="badge-live">${t("join")}</span>
          </button>`
          )
          .join("")}
      </div>
      ${nav()}
    </main>`;
  }

  function renderWallet() {
    const u = state.user;
    const gifts = state.gifts || [];
    const hist = state.history || [];
    return `<main class="screen">
      <h1 class="h1">${t("wallet")}</h1>
      <div class="grid-2 mt-4">
        <div class="card"><div class="muted" style="font-size:12px">${t("coins")}</div><div class="brand" style="color:var(--gold);font-size:2rem">${u?.coins ?? 0}</div></div>
        <div class="card"><div class="muted" style="font-size:12px">${t("charm")}</div><div class="brand" style="color:var(--primary);font-size:2rem">${u?.charm ?? 0}</div></div>
      </div>
      <button class="btn btn-gold btn-block mt-4" data-act="daily">${t("daily")}</button>
      <h2 class="h2 mt-6">${t("gifts")}</h2>
      <div class="grid-4">
        ${gifts
          .map(
            (g) => `<div class="gift-item"><div class="e">${g.emoji}</div><div class="n">${getLang() === "bn" ? g.nameBn : g.nameEn}</div><div class="c">${g.cost}</div></div>`
          )
          .join("")}
      </div>
      <h2 class="h2 mt-6">${t("history")}</h2>
      <div class="stack">
        ${!hist.length ? `<div class="muted">${t("noGifts")}</div>` : ""}
        ${hist
          .map(
            (h) => `<div class="card space" style="padding:10px 12px">
            <span>${h.catalog?.emoji || ""} ${getLang() === "bn" ? h.catalog?.nameBn || h.giftId : h.catalog?.nameEn || h.giftId}</span>
            <span style="color:var(--gold)">${h.cost}</span>
          </div>`
          )
          .join("")}
      </div>
      ${nav()}
    </main>`;
  }

  function renderProfile() {
    const u = state.user;
    return `<main class="screen">
      <div class="space"><h1 class="h1">${t("profile")}</h1>
        <button class="btn btn-ghost" data-act="logout">${t("signOut")}</button>
      </div>
      <div class="center mt-6">
        <div class="avatar lg" style="${avatarStyle(u?.avatarHue || 320)}">${(u?.displayName || "S").charAt(0).toUpperCase()}</div>
        <p class="muted mt-2">${t("level")} ${u?.level || 1} · XP ${u?.xp || 0}</p>
      </div>
      <div class="stack mt-6">
        <input id="pName" value="${escapeAttr(u?.displayName || "")}" placeholder="${t("name")}" />
        <textarea id="pBio" rows="3" placeholder="${t("bio")}">${escapeHtml(u?.bio || "")}</textarea>
        <div class="row">
          <button class="btn ${getLang() === "bn" ? "btn-primary" : "btn-ghost"}" style="flex:1" data-act="lang" data-v="bn">বাংলা</button>
          <button class="btn ${getLang() === "en" ? "btn-primary" : "btn-ghost"}" style="flex:1" data-act="lang" data-v="en">English</button>
        </div>
        <button class="btn btn-gold btn-block" data-act="save-profile">${t("save")}</button>
      </div>
      ${nav()}
    </main>`;
  }

  function renderRoom() {
    const room = state.room;
    if (!room) return `<main class="screen full center"><p class="muted">${t("loading")}</p></main>`;
    const seats = Array.from({ length: 8 }, (_, i) => room.members.find((m) => m.seat === i) || null);
    const targetName = room.members.find((m) => m.userId === state.target)?.displayName || "";
    return `<main class="screen full" style="padding-bottom:0;display:flex;flex-direction:column">
      ${state.fly ? `<div class="fly">${state.fly}</div>` : ""}
      <div class="space" style="padding:16px 16px 0">
        <div>
          <div style="font-family:var(--display);font-size:1.15rem;font-weight:600">${escapeHtml(room.title)}</div>
          <div class="muted" style="font-size:12px">${escapeHtml(room.topic || "")} · ${room.members.length} ${t("listeners")}</div>
        </div>
        <button class="icon-btn" data-act="leave-room">✕</button>
      </div>
      <div class="grid-4" style="padding:20px 16px">
        ${seats
          .map((p, i) => {
            if (!p) {
              return `<button class="seat" data-act="seat" data-seat="${i}"><div class="seat-empty">${t("emptySeat")}</div><span>${t("takeSeat")}</span></button>`;
            }
            const live = p.userId === state.user?.id ? state.speaking && state.micOn : !p.muted;
            return `<button class="seat" data-act="pick" data-id="${p.userId}">
              <div class="avatar ${live ? "live" : ""}" style="${avatarStyle(p.avatarHue)}">${p.displayName.charAt(0).toUpperCase()}</div>
              <span>${escapeHtml(p.displayName)}</span>
            </button>`;
          })
          .join("")}
      </div>
      <div style="flex:1;padding:0 16px;overflow:auto">
        <div class="chat-box" id="chatBox">
          ${!(state.messages || []).length ? `<p class="muted" style="font-size:12px">${t("emptyChat")}</p>` : ""}
          ${(state.messages || [])
            .map((m) => {
              if (m.kind === "gift") {
                return `<p class="chat-line"><strong>${escapeHtml(m.displayName)}</strong> <span style="color:var(--primary)">${t("giftSent")} ${m.emoji || "🎁"}</span></p>`;
              }
              return `<p class="chat-line"><strong>${escapeHtml(m.displayName)}</strong> ${escapeHtml(m.body)}</p>`;
            })
            .join("")}
        </div>
      </div>
      <div class="dock">
        <div class="row">
          <button class="icon-btn ${state.micOn ? "on" : ""}" data-act="mic">${state.micOn ? "🎤" : "🔇"}</button>
          <input id="chatInput" placeholder="${t("chat")}" style="flex:1;border-radius:999px" />
          <button class="icon-btn" data-act="send-chat">➤</button>
          <button class="icon-btn gold" data-act="open-gifts">🎁</button>
        </div>
        <p class="center muted mt-2" style="font-size:11px">${state.user?.coins ?? 0} ${t("coins")}${state.target ? " · → " + escapeHtml(targetName) : ""}</p>
      </div>
      ${state.giftOpen ? giftSheet() : ""}
    </main>`;
  }

  function giftSheet() {
    const gifts = state.gifts || [];
    return `<div class="sheet"><div class="sheet-panel">
      <div class="space"><div class="h1">${t("gifts")}</div><button class="icon-btn" data-act="close-gifts">✕</button></div>
      ${!state.target ? `<p class="muted mt-2">${t("pickSomeone")}</p>` : ""}
      <div class="grid-4 mt-3">
        ${gifts
          .map(
            (g) => `<button class="gift-item" data-act="send-gift" data-id="${g.id}" ${!state.target ? "disabled" : ""}>
            <div class="e">${g.emoji}</div><div class="n">${getLang() === "bn" ? g.nameBn : g.nameEn}</div><div class="c">${g.cost}</div>
          </button>`
          )
          .join("")}
      </div>
      ${state.err ? `<p class="err mt-2">${state.err}</p>` : ""}
    </div></div>`;
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "\u0026amp;")
      .replace(/</g, "\u0026lt;")
      .replace(/>/g, "\u0026gt;")
      .replace(/"/g, "\u0026quot;");
  }
  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, "&#39;");
  }

  function ensureFirebase() {
    const fb = state.cfg && state.cfg.firebase;
    if (!fb || !fb.apiKey || typeof firebase === "undefined" || !firebase.auth) return false;
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp({
          apiKey: fb.apiKey,
          authDomain: fb.authDomain,
          projectId: fb.projectId,
          appId: fb.appId,
        });
      }
      return true;
    } catch (e) {
      console.warn("[firebase]", e);
      return false;
    }
  }

  async function sessionFrom(res) {
    API.setToken(res.token);
    state.user = res.user;
    state.page = "home";
    state.err = "";
    state.otpSent = false;
    state.confirmation = null;
    await loadRooms();
    render();
  }

  async function handleGoogleCredential(resp) {
    try {
      const res = await API.google({ idToken: resp.credential, lang: getLang() });
      await sessionFrom(res);
    } catch (err) {
      state.err = err.message || "Google login failed";
      render();
    }
  }

  function mountAuthWidgets() {
    if (state.user) return;
    const cfg = state.cfg || {};
    if (!cfg.googleClientId) return;
    const tryMount = (tries) => {
      if (state.user) return;
      const host = document.getElementById("google-btn-host");
      if (!host) return;
      if (typeof google === "undefined" || !google.accounts || !google.accounts.id) {
        if (tries > 0) setTimeout(() => tryMount(tries - 1), 150);
        return;
      }
      google.accounts.id.initialize({
        client_id: cfg.googleClientId,
        callback: handleGoogleCredential,
        auto_select: false,
        ux_mode: "popup",
      });
      host.innerHTML = "";
      google.accounts.id.renderButton(host, {
        theme: "filled_black",
        size: "large",
        width: Math.max(host.clientWidth || 320, 280),
        text: "continue_with",
        shape: "pill",
        logo_alignment: "left",
      });
    };
    tryMount(40);
  }

  function render() {
    let html = "";
    if (!state.user) html = renderLogin();
    else if (state.page === "room") html = renderRoom();
    else if (state.page === "rooms") html = renderRooms();
    else if (state.page === "wallet") html = renderWallet();
    else if (state.page === "profile") html = renderProfile();
    else html = renderHome();
    root.innerHTML = html;
    const box = document.getElementById("chatBox");
    if (box) box.scrollTop = box.scrollHeight;
    mountAuthWidgets();
  }

  async function refreshMe() {
    const data = await API.me();
    state.user = data.user;
  }

  async function loadRooms() {
    const data = await API.rooms();
    state.rooms = data.rooms || [];
  }

  async function enterRoom(id) {
    state.roomId = id;
    state.page = "room";
    state.messages = [];
    state.target = null;
    state.err = "";
    const joinRes = await API.joinRoom(id);
    if (window.AgoraVoice && joinRes.agora) {
      try { await window.AgoraVoice.join(joinRes.agora); } catch (e) { console.warn(e); }
    }
    const [room, msgs, prof] = await Promise.all([API.getRoom(id), API.messages(id), API.profile()]);
    state.room = room;
    state.messages = msgs.messages || [];
    state.gifts = prof.gifts || [];
    state.user = prof.user;
    if (!state.socket && window.io) {
      state.socket = io();
    }
    if (state.socket) {
      state.socket.emit("join-room", id);
      state.socket.off("chat");
      state.socket.on("chat", (msg) => {
        state.messages.push(msg);
        if (msg.kind === "gift" && msg.emoji) {
          state.fly = msg.emoji;
          setTimeout(() => {
            state.fly = null;
            render();
          }, 900);
        }
        render();
      });
    }
    render();
  }

  async function leaveRoom() {
    if (state.roomId) {
      try {
        await API.leaveRoom(state.roomId);
      } catch (_) {}
      if (state.socket) state.socket.emit("leave-room", state.roomId);
    }
    if (window.AgoraVoice) {
      try { await window.AgoraVoice.leave(); } catch (_) {}
    }
    if (state.stream) {
      state.stream.getTracks().forEach((tr) => tr.stop());
      state.stream = null;
    }
    state.micOn = false;
    state.speaking = false;
    state.roomId = null;
    state.room = null;
    state.page = "home";
    await loadRooms();
    render();
  }

  async function toggleMic() {
    if (state.micOn) {
      state.stream?.getTracks().forEach((tr) => tr.stop());
      state.stream = null;
      state.micOn = false;
      state.speaking = false;
      if (window.AgoraVoice) { try { await window.AgoraVoice.setMuted(true); } catch (_) {} }
      await API.setMute(state.roomId, true);
      render();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      state.stream = stream;
      state.micOn = true;
      if (window.AgoraVoice) { try { await window.AgoraVoice.setMuted(false); } catch (_) {} }
      await API.setMute(state.roomId, false);
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const loop = () => {
        if (!state.stream) return;
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        const next = avg > 18;
        if (next !== state.speaking) {
          state.speaking = next;
          render();
        }
        requestAnimationFrame(loop);
      };
      loop();
      render();
    } catch {
      state.micOn = false;
      render();
    }
  }

  async function sendOtp() {
    const phone = document.getElementById("phone")?.value?.trim() || "";
    state.phoneDraft = phone;
    if (!phone || phone.replace(/\D/g, "").length < 8) {
      state.err = t("phoneRequired");
      render();
      return;
    }
    if (!ensureFirebase()) {
      state.err = t("phoneUnavailable");
      render();
      return;
    }
    const container = document.getElementById("recaptcha-container");
    if (!container) {
      state.err = t("phoneUnavailable");
      render();
      return;
    }
    if (!window._recaptcha) {
      window._recaptcha = new firebase.auth.RecaptchaVerifier("recaptcha-container", { size: "invisible" });
    }
    try {
      const confirmation = await firebase.auth().signInWithPhoneNumber(phone, window._recaptcha);
      state.confirmation = confirmation;
      state.otpSent = true;
      state.err = "";
      render();
    } catch (e) {
      try { window._recaptcha.clear(); } catch (_) {}
      window._recaptcha = null;
      throw e;
    }
  }

  async function verifyOtp() {
    const code = document.getElementById("otp")?.value?.trim() || "";
    if (!code) {
      state.err = t("otpRequired");
      render();
      return;
    }
    if (!state.confirmation) {
      state.err = t("phoneRequired");
      render();
      return;
    }
    const cred = await state.confirmation.confirm(code);
    const idToken = await cred.user.getIdToken();
    const displayName = document.getElementById("name")?.value?.trim();
    const res = await API.phone({ idToken, displayName, lang: getLang() });
    await sessionFrom(res);
  }

  root.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const act = btn.dataset.act;
    const v = btn.dataset.v;
    try {
      if (act === "lang") {
        setLang(v);
        if (state.user) {
          try {
            await API.updateProfile({ lang: v });
          } catch (_) {}
        }
        render();
        return;
      }
      if (act === "toggle-mode") {
        state.mode = state.mode === "up" ? "in" : "up";
        state.err = "";
        render();
        return;
      }
      if (act === "google") {
        state.err = t("googleUnavailable");
        render();
        return;
      }
      if (act === "send-otp") {
        state.err = "";
        await sendOtp();
        return;
      }
      if (act === "verify-otp") {
        state.err = "";
        await verifyOtp();
        return;
      }
      if (act === "auth-submit") {
        state.err = "";
        const email = document.getElementById("email")?.value?.trim();
        const password = document.getElementById("password")?.value || "";
        const displayName = document.getElementById("name")?.value?.trim();
        const res =
          state.mode === "up"
            ? await API.register({ email, password, displayName, lang: getLang() })
            : await API.login({ email, password });
        await sessionFrom(res);
        return;
      }
      if (act === "nav") {
        state.page = v;
        state.err = "";
        if (v === "home" || v === "rooms") await loadRooms();
        if (v === "wallet") {
          const [p, h] = await Promise.all([API.profile(), API.giftHistory()]);
          state.user = p.user;
          state.gifts = p.gifts || [];
          state.history = h.history || [];
        }
        if (v === "profile") {
          const p = await API.profile();
          state.user = p.user;
        }
        render();
        return;
      }
      if (act === "open-create") {
        state.createOpen = true;
        state.err = "";
        render();
        return;
      }
      if (act === "close-create") {
        state.createOpen = false;
        render();
        return;
      }
      if (act === "create-room") {
        const title = document.getElementById("roomTitle")?.value?.trim() || "";
        const topic = document.getElementById("roomTopic")?.value?.trim() || "";
        if (title.length < 2) {
          state.err = "Title required";
          render();
          return;
        }
        const res = await API.createRoom({ title, topic });
        state.createOpen = false;
        await enterRoom(res.room.id);
        return;
      }
      if (act === "enter") {
        await enterRoom(btn.dataset.id);
        return;
      }
      if (act === "leave-room") {
        await leaveRoom();
        return;
      }
      if (act === "seat") {
        await API.takeSeat(state.roomId, Number(btn.dataset.seat));
        state.room = await API.getRoom(state.roomId);
        render();
        return;
      }
      if (act === "pick") {
        state.target = btn.dataset.id;
        render();
        return;
      }
      if (act === "mic") {
        await toggleMic();
        return;
      }
      if (act === "send-chat") {
        const input = document.getElementById("chatInput");
        const body = input?.value?.trim();
        if (!body) return;
        await API.sendMessage(state.roomId, body);
        input.value = "";
        return;
      }
      if (act === "open-gifts") {
        state.giftOpen = true;
        state.err = "";
        render();
        return;
      }
      if (act === "close-gifts") {
        state.giftOpen = false;
        render();
        return;
      }
      if (act === "send-gift") {
        if (!state.target) {
          state.err = t("pickSomeone");
          render();
          return;
        }
        try {
          const res = await API.sendGift(state.roomId, state.target, btn.dataset.id);
          state.user.coins = res.coins;
          state.fly = res.gift.emoji;
          state.giftOpen = false;
          render();
          setTimeout(() => {
            state.fly = null;
            render();
          }, 900);
        } catch (err) {
          state.err = err.message || t("needCoins");
          render();
        }
        return;
      }
      if (act === "daily") {
        const res = await API.daily();
        state.user.coins = res.coins;
        render();
        return;
      }
      if (act === "save-profile") {
        const displayName = document.getElementById("pName")?.value?.trim();
        const bio = document.getElementById("pBio")?.value || "";
        const res = await API.updateProfile({ displayName, bio, lang: getLang() });
        state.user = res.user;
        render();
        return;
      }
      if (act === "logout") {
        API.setToken("");
        state.user = null;
        state.page = "login";
        state.mode = "in";
        state.err = "";
        state.otpSent = false;
        state.confirmation = null;
        render();
        return;
      }
    } catch (err) {
      state.err = err.message || "Error";
      render();
    }
  });

  root.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target && e.target.id === "chatInput") {
      e.preventDefault();
      root.querySelector('[data-act="send-chat"]')?.click();
    }
    if (e.key === "Enter" && e.target && (e.target.id === "email" || e.target.id === "password")) {
      e.preventDefault();
      root.querySelector('[data-act="auth-submit"]')?.click();
    }
    if (e.key === "Enter" && e.target && e.target.id === "otp") {
      e.preventDefault();
      root.querySelector('[data-act="verify-otp"]')?.click();
    }
  });

  async function boot() {
    render();
    try {
      state.cfg = await API.config();
      render();
    } catch (_) {
      state.cfg = { googleClientId: "", firebase: {} };
    }
    if (!API.token()) return;
    try {
      await refreshMe();
      state.page = "home";
      await loadRooms();
      render();
      setInterval(() => {
        if (state.user && (state.page === "home" || state.page === "rooms")) {
          loadRooms().then(render).catch(() => {});
        }
        if (state.user && state.page === "room" && state.roomId) {
          API.getRoom(state.roomId)
            .then((r) => {
              state.room = r;
              render();
            })
            .catch(() => {});
        }
      }, 5000);
    } catch {
      API.setToken("");
      state.user = null;
      render();
    }
  }

  boot();
})();
