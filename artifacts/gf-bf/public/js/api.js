window.API = (() => {
  function token() {
    return localStorage.getItem("gfbf-token") || "";
  }
  async function req(path, opts = {}) {
    const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
    const tok = token();
    if (tok) headers.Authorization = "Bearer " + tok;
    const res = await fetch(path, { ...opts, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  }
  return {
    token,
    setToken: (t) => (t ? localStorage.setItem("gfbf-token", t) : localStorage.removeItem("gfbf-token")),
    register: (body) => req("/api/auth/register", { method: "POST", body: JSON.stringify(body) }),
    login: (body) => req("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
    guest: (body) => req("/api/auth/guest", { method: "POST", body: JSON.stringify(body || {}) }),
    google: (body) => req("/api/auth/google", { method: "POST", body: JSON.stringify(body) }),
    phone: (body) => req("/api/auth/phone", { method: "POST", body: JSON.stringify(body) }),
    me: () => req("/api/auth/me"),
    rooms: () => req("/api/rooms"),
    createRoom: (body) => req("/api/rooms", { method: "POST", body: JSON.stringify(body) }),
    getRoom: (id) => req("/api/rooms/" + id),
    joinRoom: (id) => req("/api/rooms/" + id + "/join", { method: "POST", body: "{}" }),
    leaveRoom: (id) => req("/api/rooms/" + id + "/leave", { method: "POST", body: "{}" }),
    takeSeat: (id, seat) => req("/api/rooms/" + id + "/seat", { method: "POST", body: JSON.stringify({ seat }) }),
    setMute: (id, muted) => req("/api/rooms/" + id + "/mute", { method: "POST", body: JSON.stringify({ muted }) }),
    kick: (id, userId) => req("/api/rooms/" + id + "/kick", { method: "POST", body: JSON.stringify({ userId }) }),
    messages: (id) => req("/api/rooms/" + id + "/messages"),
    sendMessage: (id, body) => req("/api/rooms/" + id + "/messages", { method: "POST", body: JSON.stringify({ body }) }),
    sendGift: (id, toUser, giftId) =>
      req("/api/rooms/" + id + "/gift", { method: "POST", body: JSON.stringify({ toUser, giftId }) }),
    profile: () => req("/api/user/profile"),
    updateProfile: (body) => req("/api/user/profile", { method: "PATCH", body: JSON.stringify(body) }),
    daily: () => req("/api/user/daily", { method: "POST", body: "{}" }),
    giftHistory: () => req("/api/user/gifts/history"),
    follow: (id) => req("/api/user/follow/" + id, { method: "POST", body: "{}" }),
  };
})();
