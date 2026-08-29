import { o as __toESM } from "../_runtime.mjs";
import { H as require_react, S as require_jsx_runtime, b as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Mic, c as Gift, i as Send, o as MicOff, t as X } from "../_libs/lucide-react.mjs";
import { a as cn, d as useCurrentUserState, f as useLang, l as toggleFollow, n as AuthedShell, s as ensureMyProfile } from "./app-shell-1_ZZ4i4K.mjs";
import { n as Field } from "./field-DocRL8aU.mjs";
import { t as Avatar } from "./avatar-B7vNoIcq.mjs";
import { n as giftById, t as GIFTS } from "./gifts-B-a4BAi4.mjs";
import { a as leaveRoom, c as sendGift, d as takeSeat, i as kickMember, l as sendMessage, n as getRoom, o as listMessages, r as joinRoom, u as setMuted } from "./rooms-Cmi_E6oo.mjs";
import { n as peerIdFromUser, r as signalRoom } from "./ids-BspsANa3.mjs";
import { n as Route$1 } from "./router-BqMsr3L7.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/rooms._id-DnZ6M3HT.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var FAST_POLL_MS = 400;
var IDLE_POLL_MS = 2e3;
var PING_INTERVAL_MS = 2e3;
var STALL_MS = 1e4;
var MAX_RECOVERY_ATTEMPTS = 3;
var SIGNAL_RETRY_DELAYS_MS = [250, 750];
function defaultIceServers() {
	return [{ urls: ["stun:stun.l.google.com:19302", "stun:stun.cloudflare.com:3478"] }];
}
var P2PRoom = class {
	opts;
	peers = /* @__PURE__ */ new Map();
	/** Per-remote-peer signal delivery chains (order-preserving). */
	signalQueues = /* @__PURE__ */ new Map();
	cursor = 0;
	pollTimer = null;
	pingTimer = null;
	closed = false;
	everPolled = false;
	lastPeersFingerprint = "";
	constructor(opts) {
		this.opts = opts;
	}
	/**
	* The first poll IS the join: it registers this peer and returns the
	* roster. A failed first poll (cold DB, offline tab) must not strand the
	* room: the loop and timers start regardless and the next poll retries.
	*/
	async join() {
		try {
			await this.pollOnce();
		} catch {}
		if (this.closed) return;
		this.schedulePoll(this.anyPairConnecting() ? FAST_POLL_MS : IDLE_POLL_MS);
		this.pingTimer = setInterval(() => {
			this.pingAll();
			this.watchdog();
		}, PING_INTERVAL_MS);
	}
	close() {
		this.closed = true;
		if (this.pollTimer) clearTimeout(this.pollTimer);
		if (this.pingTimer) clearInterval(this.pingTimer);
		for (const slot of this.peers.values()) slot.pc.close();
		this.peers.clear();
		fetch("/api/rtc", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				op: "leave",
				room: this.opts.room,
				peer: this.opts.selfId
			}),
			keepalive: true
		}).catch(() => {});
	}
	/** Send on the unreliable game-state channel (drops stale packets). */
	broadcast(data) {
		const wire = JSON.stringify({
			t: "d",
			d: data
		});
		for (const slot of this.peers.values()) if (slot.state?.readyState === "open") slot.state.send(wire);
	}
	/** Send reliably (ordered) to one peer, or to all when peerId is omitted. */
	send(data, peerId) {
		const wire = JSON.stringify({
			t: "d",
			d: data
		});
		const targets = peerId ? [this.peers.get(peerId)] : [...this.peers.values()];
		for (const slot of targets) if (slot?.reliable?.readyState === "open") slot.reliable.send(wire);
	}
	peerList() {
		return [...this.peers.values()].map((s) => ({ ...s.info }));
	}
	schedulePoll(delay) {
		if (this.closed) return;
		if (this.pollTimer) clearTimeout(this.pollTimer);
		this.pollTimer = setTimeout(() => void this.poll(), delay);
	}
	anyPairConnecting() {
		for (const s of this.peers.values()) {
			if (s.terminal) continue;
			if (s.info.connectionState !== "connected") return true;
		}
		return false;
	}
	async pollOnce() {
		const params = new URLSearchParams({
			room: this.opts.room,
			peer: this.opts.selfId,
			name: this.opts.name ?? "",
			since: String(this.cursor)
		});
		const res = await fetch(`/api/rtc?${params}`);
		if (this.closed) return;
		if (!res.ok) throw new Error(`signaling poll failed: ${res.status}`);
		const body = await res.json();
		if (this.closed) return;
		if (!this.everPolled) {
			this.everPolled = true;
			this.opts.onConnected?.();
		}
		this.reconcileRoster(body.peers);
		const roster = new Set(body.peers.map((p) => p.id));
		for (const sig of body.signals) {
			this.cursor = Math.max(this.cursor, sig.id);
			await this.onSignal(sig.from, sig.kind, sig.payload, roster);
			if (this.closed) return;
		}
	}
	async poll() {
		if (this.closed) return;
		try {
			await this.pollOnce();
		} catch {}
		this.schedulePoll(this.anyPairConnecting() ? FAST_POLL_MS : IDLE_POLL_MS);
	}
	reconcileRoster(peers) {
		const alive = new Set(peers.map((p) => p.id));
		for (const p of peers) {
			if (p.id === this.opts.selfId) continue;
			const existing = this.peers.get(p.id);
			if (existing) existing.info.name = p.name;
			else this.connectTo(p.id, p.name, this.opts.selfId > p.id);
		}
		for (const [id, slot] of this.peers) if (!alive.has(id)) {
			slot.pc.close();
			this.peers.delete(id);
		}
		this.emitPeers();
	}
	connectTo(peerId, name, initiator) {
		if (this.closed) return null;
		const pc = new RTCPeerConnection({ iceServers: this.opts.iceServers ?? defaultIceServers() });
		const slot = {
			pc,
			makingOffer: false,
			ignoreOffer: false,
			pendingCandidates: [],
			lastProgressAt: Date.now(),
			recoveryAttempts: 0,
			info: {
				id: peerId,
				name,
				connectionState: pc.connectionState,
				candidateType: null,
				rttMs: null
			}
		};
		this.peers.set(peerId, slot);
		pc.onicecandidate = (e) => {
			if (e.candidate) this.sendSignal(peerId, "ice", e.candidate.toJSON());
		};
		pc.onconnectionstatechange = () => {
			slot.info.connectionState = pc.connectionState;
			if (pc.connectionState === "connecting" || pc.connectionState === "connected") slot.lastProgressAt = Date.now();
			if (pc.connectionState === "connected") {
				slot.recoveryAttempts = 0;
				slot.terminal = false;
				this.readCandidateType(slot);
			}
			this.emitPeers();
			if (pc.connectionState === "failed") pc.restartIce();
			if (pc.connectionState === "failed" || pc.connectionState === "disconnected") this.schedulePoll(FAST_POLL_MS);
		};
		pc.onnegotiationneeded = async () => {
			try {
				slot.makingOffer = true;
				await pc.setLocalDescription();
				await this.sendSignal(peerId, "offer", pc.localDescription.toJSON());
			} catch {} finally {
				slot.makingOffer = false;
			}
		};
		pc.ondatachannel = (e) => this.attachChannel(slot, e.channel);
		if (initiator) {
			this.attachChannel(slot, pc.createDataChannel("state", {
				ordered: false,
				maxRetransmits: 0
			}));
			this.attachChannel(slot, pc.createDataChannel("reliable", { ordered: true }));
		}
		return slot;
	}
	attachChannel(slot, channel) {
		if (channel.label === "state") slot.state = channel;
		else slot.reliable = channel;
		channel.onopen = () => {
			slot.lastProgressAt = Date.now();
		};
		channel.onmessage = (e) => {
			let msg;
			try {
				msg = JSON.parse(e.data);
			} catch {
				return;
			}
			if (msg.t === "ping") {
				if (slot.state?.readyState === "open") slot.state.send(JSON.stringify({ t: "pong" }));
			} else if (msg.t === "pong") {
				if (slot.pingSentAt) {
					slot.info.rttMs = Math.round(performance.now() - slot.pingSentAt);
					slot.pingSentAt = void 0;
					this.emitPeers();
				}
			} else this.opts.onMessage?.(slot.info.id, msg.d, channel.label === "state" ? "state" : "reliable");
		};
	}
	/** Apply buffered ICE candidates once a remote description is in place. */
	async flushPendingCandidates(slot) {
		while (slot.pendingCandidates.length > 0) {
			const candidate = slot.pendingCandidates.shift();
			try {
				await slot.pc.addIceCandidate(candidate);
			} catch (err) {
				if (!slot.ignoreOffer) console.warn("[p2p] addIceCandidate failed:", err);
			}
			if (this.closed) return;
		}
	}
	async onSignal(from, kind, payload, roster) {
		if (this.closed) return;
		let slot = this.peers.get(from);
		if (!slot) {
			if (!roster.has(from)) return;
			const created = this.connectTo(from, "", false);
			if (!created) return;
			slot = created;
		}
		const polite = this.opts.selfId < from;
		try {
			if (kind === "offer" || kind === "answer") {
				const description = payload;
				const collision = kind === "offer" && (slot.makingOffer || slot.pc.signalingState !== "stable");
				slot.ignoreOffer = !polite && collision;
				if (slot.ignoreOffer) return;
				try {
					await slot.pc.setRemoteDescription(description);
				} catch (err) {
					if (kind !== "offer" || slot.recreatedForOffer) throw err;
					const attempts = slot.recoveryAttempts;
					const name = slot.info.name;
					slot.pc.close();
					this.peers.delete(from);
					const fresh = this.connectTo(from, name, false);
					if (!fresh) return;
					fresh.recoveryAttempts = attempts;
					fresh.recreatedForOffer = true;
					slot = fresh;
					await slot.pc.setRemoteDescription(description);
				}
				if (this.closed) return;
				await this.flushPendingCandidates(slot);
				if (this.closed) return;
				if (kind === "offer") {
					await slot.pc.setLocalDescription();
					if (this.closed) return;
					await this.sendSignal(from, "answer", slot.pc.localDescription.toJSON());
				}
			} else if (kind === "ice") {
				const candidate = payload;
				if (!slot.pc.remoteDescription) {
					slot.pendingCandidates.push(candidate);
					return;
				}
				try {
					await slot.pc.addIceCandidate(candidate);
				} catch (err) {
					if (!slot.ignoreOffer) console.warn("[p2p] addIceCandidate failed:", err);
				}
			}
		} catch {}
	}
	/**
	* Signals are serialized per remote peer (a candidate must never overtake
	* its SDP into the DB) and retried on failure with short backoff.
	*/
	sendSignal(to, kind, payload) {
		const next = (this.signalQueues.get(to) ?? Promise.resolve()).then(() => this.postSignal(to, kind, payload));
		this.signalQueues.set(to, next.catch(() => {}));
		return next;
	}
	async postSignal(to, kind, payload) {
		for (let attempt = 0;; attempt++) {
			if (this.closed) return;
			try {
				const res = await fetch("/api/rtc", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						op: "signal",
						room: this.opts.room,
						from: this.opts.selfId,
						to,
						kind,
						payload
					})
				});
				if (res.ok) return;
				throw new Error(`signal POST failed: ${res.status}`);
			} catch (err) {
				if (attempt >= SIGNAL_RETRY_DELAYS_MS.length) {
					console.warn(`[p2p] signal ${kind} to ${to} failed after retries`, err);
					return;
				}
				await new Promise((r) => setTimeout(r, SIGNAL_RETRY_DELAYS_MS[attempt]));
			}
		}
	}
	pingAll() {
		const wire = JSON.stringify({ t: "ping" });
		for (const slot of this.peers.values()) {
			if (slot.state?.readyState !== "open") continue;
			const stale = slot.pingSentAt !== void 0 && performance.now() - slot.pingSentAt > 2 * PING_INTERVAL_MS;
			if (slot.pingSentAt === void 0 || stale) {
				slot.pingSentAt = performance.now();
				slot.state.send(wire);
			}
		}
	}
	/**
	* Stuck-pair recovery, piggybacked on the ping interval. A pair that has
	* made no progress for STALL_MS gets rebuilt by the dialer with a FRESH
	* RTCPeerConnection (new DTLS identity — fixes the suspend/resume
	* fingerprint wedge). After MAX_RECOVERY_ATTEMPTS the pair is terminal:
	* visible to the app as its last connectionState, ignored by fast-poll.
	*/
	watchdog() {
		if (this.closed) return;
		const now = Date.now();
		for (const [peerId, slot] of this.peers) {
			const live = slot.pc.connectionState;
			if (live !== slot.info.connectionState) {
				slot.info.connectionState = live;
				if (live === "connecting" || live === "connected") slot.lastProgressAt = now;
				this.emitPeers();
			}
			if (slot.terminal || live === "connected") continue;
			if (now - slot.lastProgressAt <= STALL_MS) continue;
			if (slot.recoveryAttempts >= MAX_RECOVERY_ATTEMPTS) {
				slot.terminal = true;
				this.emitPeers();
				continue;
			}
			slot.recoveryAttempts += 1;
			slot.lastProgressAt = now;
			if (this.opts.selfId > peerId) {
				const { name } = slot.info;
				const attempts = slot.recoveryAttempts;
				slot.pc.close();
				this.peers.delete(peerId);
				const fresh = this.connectTo(peerId, name, true);
				if (fresh) fresh.recoveryAttempts = attempts;
				this.schedulePoll(FAST_POLL_MS);
			}
		}
	}
	async readCandidateType(slot) {
		try {
			const stats = await slot.pc.getStats();
			let selected;
			stats.forEach((s) => {
				if (s.type === "candidate-pair" && s.nominated) selected = s;
			});
			const localId = selected?.localCandidateId;
			if (localId) {
				const local = stats.get(localId);
				slot.info.candidateType = local?.candidateType ?? null;
				this.emitPeers();
			}
		} catch {}
	}
	emitPeers() {
		const list = this.peerList();
		const fingerprint = JSON.stringify(list.map((p) => [
			p.id,
			p.name,
			p.connectionState,
			p.candidateType,
			p.rttMs
		]));
		if (fingerprint === this.lastPeersFingerprint) return;
		this.lastPeersFingerprint = fingerprint;
		this.opts.onPeersChanged?.(list);
	}
};
function useP2PRoom(options) {
	const [selfId] = (0, import_react.useState)(() => options.selfId);
	const [room] = (0, import_react.useState)(() => options.room);
	const [name] = (0, import_react.useState)(() => options.name ?? selfId);
	const enabled = options.enabled !== false;
	const [peers, setPeers] = (0, import_react.useState)([]);
	const [joined, setJoined] = (0, import_react.useState)(false);
	const roomRef = (0, import_react.useRef)(null);
	const listeners = (0, import_react.useRef)(/* @__PURE__ */ new Set());
	(0, import_react.useEffect)(() => {
		if (!enabled) return;
		const p2p = new P2PRoom({
			room,
			selfId,
			name,
			onPeersChanged: setPeers,
			onMessage: (from, data, channel) => {
				for (const fn of listeners.current) fn(from, data, channel);
			},
			onConnected: () => setJoined(true)
		});
		roomRef.current = p2p;
		p2p.join();
		return () => {
			roomRef.current = null;
			p2p.close();
		};
	}, [
		room,
		selfId,
		name,
		enabled
	]);
	return {
		selfId,
		room,
		peers,
		joined,
		broadcast: (0, import_react.useCallback)((data) => roomRef.current?.broadcast(data), []),
		send: (0, import_react.useCallback)((data, peerId) => roomRef.current?.send(data, peerId), []),
		onMessage: (0, import_react.useCallback)((fn) => {
			listeners.current.add(fn);
			return () => {
				listeners.current.delete(fn);
			};
		}, [])
	};
}
var VoiceMesh = class {
	room;
	selfId;
	name;
	stream = null;
	peers = /* @__PURE__ */ new Map();
	cursor = 0;
	pollTimer = null;
	closed = false;
	onRemoteCount;
	constructor(opts) {
		this.room = opts.room;
		this.selfId = opts.selfId;
		this.name = opts.name;
		this.stream = opts.stream;
		this.onRemoteCount = opts.onRemoteCount;
	}
	setMuted(muted) {
		this.stream?.getAudioTracks().forEach((t) => {
			t.enabled = !muted;
		});
	}
	async join() {
		try {
			await this.pollOnce();
		} catch {}
		if (this.closed) return;
		this.schedule(800);
	}
	close() {
		this.closed = true;
		if (this.pollTimer) clearTimeout(this.pollTimer);
		for (const slot of this.peers.values()) {
			slot.audio?.pause();
			slot.audio?.remove();
			slot.pc.close();
		}
		this.peers.clear();
		this.stream?.getTracks().forEach((t) => t.stop());
		this.stream = null;
		fetch("/api/rtc", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				op: "leave",
				room: this.room,
				peer: this.selfId
			}),
			keepalive: true
		}).catch(() => {});
	}
	schedule(ms) {
		if (this.closed) return;
		if (this.pollTimer) clearTimeout(this.pollTimer);
		this.pollTimer = setTimeout(() => void this.poll(), ms);
	}
	async poll() {
		if (this.closed) return;
		try {
			await this.pollOnce();
		} catch {}
		this.schedule(1e3);
	}
	async pollOnce() {
		const params = new URLSearchParams({
			room: this.room,
			peer: this.selfId,
			name: this.name,
			since: String(this.cursor)
		});
		const res = await fetch(`/api/rtc?${params}`);
		if (!res.ok || this.closed) return;
		const body = await res.json();
		this.reconcile(body.peers);
		const roster = new Set(body.peers.map((p) => p.id));
		for (const sig of body.signals) {
			this.cursor = Math.max(this.cursor, sig.id);
			await this.onSignal(sig.from, sig.kind, sig.payload, roster);
			if (this.closed) return;
		}
	}
	reconcile(peers) {
		const alive = new Set(peers.map((p) => p.id));
		for (const p of peers) {
			if (p.id === this.selfId) continue;
			if (!this.peers.has(p.id)) this.connect(p.id, this.selfId > p.id);
		}
		for (const [id, slot] of this.peers) if (!alive.has(id)) {
			slot.audio?.pause();
			slot.audio?.remove();
			slot.pc.close();
			this.peers.delete(id);
		}
		this.onRemoteCount?.(this.peers.size);
	}
	connect(peerId, initiator) {
		const pc = new RTCPeerConnection({ iceServers: defaultIceServers() });
		const slot = {
			pc,
			makingOffer: false,
			ignoreOffer: false,
			pending: []
		};
		this.peers.set(peerId, slot);
		this.stream?.getAudioTracks().forEach((t) => pc.addTrack(t, this.stream));
		pc.onicecandidate = (e) => {
			if (e.candidate) this.signal(peerId, "ice", e.candidate.toJSON());
		};
		pc.ontrack = (e) => {
			const stream = e.streams[0] ?? new MediaStream([e.track]);
			let audio = slot.audio;
			if (!audio) {
				audio = document.createElement("audio");
				audio.autoplay = true;
				audio.setAttribute("playsinline", "true");
				audio.style.display = "none";
				document.body.appendChild(audio);
				slot.audio = audio;
			}
			audio.srcObject = stream;
			audio.play().catch(() => {});
		};
		pc.onnegotiationneeded = async () => {
			try {
				slot.makingOffer = true;
				await pc.setLocalDescription();
				if (pc.localDescription) await this.signal(peerId, "offer", pc.localDescription.toJSON());
			} catch {} finally {
				slot.makingOffer = false;
			}
		};
		if (initiator) pc.setLocalDescription().then(() => {
			if (pc.localDescription) this.signal(peerId, "offer", pc.localDescription.toJSON());
		}).catch(() => {});
	}
	async onSignal(from, kind, payload, roster) {
		if (this.closed) return;
		let slot = this.peers.get(from);
		if (!slot) {
			if (!roster.has(from)) return;
			this.connect(from, false);
			slot = this.peers.get(from);
			if (!slot) return;
		}
		const polite = this.selfId < from;
		try {
			if (kind === "offer" || kind === "answer") {
				const description = payload;
				const collision = kind === "offer" && (slot.makingOffer || slot.pc.signalingState !== "stable");
				slot.ignoreOffer = !polite && collision;
				if (slot.ignoreOffer) return;
				await slot.pc.setRemoteDescription(description);
				while (slot.pending.length) {
					const c = slot.pending.shift();
					try {
						await slot.pc.addIceCandidate(c);
					} catch {}
				}
				if (kind === "offer") {
					await slot.pc.setLocalDescription();
					if (slot.pc.localDescription) await this.signal(from, "answer", slot.pc.localDescription.toJSON());
				}
			} else if (kind === "ice") {
				const candidate = payload;
				if (!slot.pc.remoteDescription) {
					slot.pending.push(candidate);
					return;
				}
				try {
					await slot.pc.addIceCandidate(candidate);
				} catch {}
			}
		} catch {}
	}
	async signal(to, kind, payload) {
		await fetch("/api/rtc", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				op: "signal",
				room: this.room,
				from: this.selfId,
				to,
				kind,
				payload
			})
		});
	}
};
function useVoiceMesh(opts) {
	const [error, setError] = (0, import_react.useState)(null);
	const [ready, setReady] = (0, import_react.useState)(false);
	const [remoteCount, setRemoteCount] = (0, import_react.useState)(0);
	const [muted, setMutedState] = (0, import_react.useState)(true);
	const meshRef = (0, import_react.useRef)(null);
	const analyserRef = (0, import_react.useRef)(null);
	const [speaking, setSpeaking] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (!opts.live) return;
		let cancelled = false;
		let ctx = null;
		let raf = 0;
		(async () => {
			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					audio: {
						echoCancellation: true,
						noiseSuppression: true
					},
					video: false
				});
				if (cancelled) {
					stream.getTracks().forEach((t) => t.stop());
					return;
				}
				stream.getAudioTracks().forEach((t) => {
					t.enabled = false;
				});
				const mesh = new VoiceMesh({
					room: opts.room,
					selfId: opts.selfId,
					name: opts.name,
					stream,
					onRemoteCount: setRemoteCount
				});
				meshRef.current = mesh;
				await mesh.join();
				if (cancelled) {
					mesh.close();
					return;
				}
				setReady(true);
				ctx = new AudioContext();
				const source = ctx.createMediaStreamSource(stream);
				const analyser = ctx.createAnalyser();
				analyser.fftSize = 512;
				source.connect(analyser);
				analyserRef.current = analyser;
				const data = new Uint8Array(analyser.frequencyBinCount);
				const loop = () => {
					analyser.getByteTimeDomainData(data);
					let sum = 0;
					for (let i = 0; i < data.length; i++) {
						const v = (data[i] - 128) / 128;
						sum += v * v;
					}
					const rms = Math.sqrt(sum / data.length);
					setSpeaking(rms > .04);
					raf = requestAnimationFrame(loop);
				};
				raf = requestAnimationFrame(loop);
			} catch (e) {
				if (!cancelled) setError(e instanceof Error ? e.message : "Microphone blocked");
			}
		})();
		return () => {
			cancelled = true;
			cancelAnimationFrame(raf);
			analyserRef.current = null;
			ctx?.close().catch(() => {});
			meshRef.current?.close();
			meshRef.current = null;
			setReady(false);
			setSpeaking(false);
		};
	}, [
		opts.room,
		opts.selfId,
		opts.name,
		opts.live
	]);
	return {
		error,
		ready,
		remoteCount,
		muted,
		setMuted: (0, import_react.useCallback)((next) => {
			setMutedState(next);
			meshRef.current?.setMuted(next);
		}, []),
		speaking
	};
}
function RoomPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthedShell, {
		nav: false,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RoomInner, {})
	});
}
function RoomInner() {
	const { id } = Route$1.useParams();
	const { user } = useCurrentUserState();
	const t = useLang((s) => s.t);
	const lang = useLang((s) => s.lang);
	const navigate = useNavigate();
	const [room, setRoom] = (0, import_react.useState)(null);
	const [messages, setMessages] = (0, import_react.useState)([]);
	const [profile, setProfile] = (0, import_react.useState)(null);
	const [chat, setChat] = (0, import_react.useState)("");
	const [target, setTarget] = (0, import_react.useState)(null);
	const [giftsOpen, setGiftsOpen] = (0, import_react.useState)(false);
	const [fly, setFly] = (0, import_react.useState)(null);
	const [err, setErr] = (0, import_react.useState)("");
	const [micOn, setMicOn] = (0, import_react.useState)(false);
	const chatBox = (0, import_react.useRef)(null);
	const userId = user?.id ?? "";
	const selfPeer = peerIdFromUser(userId);
	const p2p = useP2PRoom({
		room: signalRoom("c", id),
		selfId: selfPeer,
		name: profile?.displayName || user?.displayName || "Star",
		enabled: Boolean(userId)
	});
	const voice = useVoiceMesh({
		room: signalRoom("v", id),
		selfId: selfPeer,
		name: profile?.displayName || "Star",
		live: Boolean(userId)
	});
	const refresh = (0, import_react.useCallback)(async () => {
		const [r, m] = await Promise.all([getRoom({ data: { id } }), listMessages({ data: { id } })]);
		setRoom(r);
		setMessages(m);
	}, [id]);
	(0, import_react.useEffect)(() => {
		let alive = true;
		(async () => {
			try {
				const p = await ensureMyProfile();
				if (!alive) return;
				setProfile(p);
				const r = await joinRoom({ data: { id } });
				if (!alive) return;
				setRoom(r);
				const m = await listMessages({ data: { id } });
				if (!alive) return;
				setMessages(m);
			} catch {
				if (alive) navigate({ to: "/" });
			}
		})();
		const tick = setInterval(() => {
			refresh().catch(() => {});
		}, 4e3);
		return () => {
			alive = false;
			clearInterval(tick);
			leaveRoom({ data: { id } }).catch(() => {});
		};
	}, [
		id,
		navigate,
		refresh
	]);
	(0, import_react.useEffect)(() => {
		return p2p.onMessage((_from, data) => {
			const msg = data;
			if (msg?.type === "chat" && msg.payload) {
				setMessages((prev) => prev.some((m) => m.id === msg.payload.id) ? prev : [...prev, msg.payload]);
				if (msg.payload.kind === "gift" && msg.payload.emoji) {
					setFly(msg.payload.emoji);
					setTimeout(() => setFly(null), 900);
				}
			}
			if (msg?.type === "refresh") refresh().catch(() => {});
		});
	}, [p2p, refresh]);
	(0, import_react.useEffect)(() => {
		if (chatBox.current) chatBox.current.scrollTop = chatBox.current.scrollHeight;
	}, [messages]);
	const speakingMap = (0, import_react.useMemo)(() => {
		const map = {};
		if (micOn && voice.speaking) map[userId] = true;
		return map;
	}, [
		micOn,
		voice.speaking,
		userId
	]);
	async function onSeat(seat) {
		try {
			const r = await takeSeat({ data: {
				id,
				seat
			} });
			setRoom(r);
			p2p.send({ type: "refresh" });
		} catch (e) {
			setErr(e instanceof Error ? e.message : "Seat taken");
		}
	}
	async function onMic() {
		const next = !micOn;
		if (next && voice.error) {
			setErr(t("needMic"));
			return;
		}
		setMicOn(next);
		voice.setMuted(!next);
		await setMuted({ data: {
			id,
			muted: !next
		} }).catch(() => {});
	}
	async function onSendChat() {
		const body = chat.trim();
		if (!body) return;
		setChat("");
		const msg = await sendMessage({ data: {
			id,
			body
		} });
		setMessages((prev) => [...prev, msg]);
		p2p.send({
			type: "chat",
			payload: msg
		});
	}
	async function onGift(giftId) {
		if (!target) {
			setErr(t("pickSomeone"));
			return;
		}
		try {
			const res = await sendGift({ data: {
				id,
				giftId,
				toUser: target
			} });
			setProfile((p) => p ? {
				...p,
				coins: res.coins
			} : p);
			setMessages((prev) => [...prev, res.message]);
			p2p.send({
				type: "chat",
				payload: res.message
			});
			setFly(res.message.emoji || giftById(giftId)?.emoji || "🎁");
			setTimeout(() => setFly(null), 900);
			setGiftsOpen(false);
			setErr("");
		} catch (e) {
			setErr(e instanceof Error ? e.message : t("needCoins"));
		}
	}
	async function onKick(uid) {
		const r = await kickMember({ data: {
			id,
			userId: uid
		} });
		setRoom(r);
		p2p.send({ type: "refresh" });
		if (target === uid) setTarget(null);
	}
	if (!room) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "grid min-h-dvh place-items-center",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm text-muted",
			children: t("loading")
		})
	});
	const seats = Array.from({ length: 8 }, (_, i) => room.members.find((m) => m.seat === i) || null);
	const targetName = room.members.find((m) => m.userId === target)?.displayName || "";
	const isHost = room.hostId === userId;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "flex min-h-dvh flex-col",
		children: [
			fly ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "gift-fly pointer-events-none fixed left-1/2 top-[20%] z-50 text-6xl",
				children: fly
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start justify-between gap-3 px-4 pt-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "font-display text-[1.15rem] font-semibold",
					children: room.title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-xs text-muted",
					children: [
						room.topic,
						" · ",
						room.members.length,
						" ",
						t("listeners"),
						voice.ready ? ` · ${t("voiceReady")}` : voice.error ? ` · ${t("needMic")}` : ` · ${t("connecting")}`
					]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "grid size-12 shrink-0 place-items-center rounded-full bg-elevated",
					onClick: () => navigate({ to: "/" }),
					"aria-label": t("leave"),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-5" })
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-4 gap-2 px-4 py-5",
				children: seats.map((p, i) => {
					if (!p) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "flex flex-col items-center gap-1 text-[10px] text-muted",
						onClick: () => onSeat(i),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "grid h-12 w-12 place-items-center rounded-full border border-dashed border-border text-[10px]",
							children: t("emptySeat")
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("takeSeat") })]
					}, i);
					const live = p.userId === userId ? micOn && voice.speaking : speakingMap[p.userId] || !p.muted;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "flex flex-col items-center gap-1 text-[10px] text-muted",
						onClick: () => setTarget(p.userId === userId ? null : p.userId),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
							name: p.displayName,
							hue: p.avatarHue,
							live: Boolean(live)
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "max-w-full truncate",
							children: p.displayName
						})]
					}, p.userId);
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "min-h-0 flex-1 overflow-auto px-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					ref: chatBox,
					className: "max-h-[220px] overflow-y-auto rounded-lg border border-border bg-surface/85 p-3",
					children: [!messages.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted",
						children: t("emptyChat")
					}) : null, messages.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mb-1.5 text-[13px]",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-gold",
								children: m.displayName
							}),
							" ",
							m.kind === "gift" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-primary",
								children: [
									t("giftSent"),
									" ",
									m.emoji || giftById(m.giftId || "")?.emoji || "🎁"
								]
							}) : m.body
						]
					}, m.id))]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "sticky bottom-0 border-t border-border bg-surface px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-2.5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2.5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: cn("grid size-12 shrink-0 place-items-center rounded-full", micOn ? "bg-primary" : "bg-elevated"),
								onClick: onMic,
								"aria-label": micOn ? t("micOn") : t("micOff"),
								children: micOn ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mic, { className: "size-5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MicOff, { className: "size-5" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								value: chat,
								onChange: (e) => setChat(e.target.value),
								placeholder: t("chat"),
								className: "rounded-pill",
								onKeyDown: (e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										onSendChat();
									}
								}
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "grid size-12 shrink-0 place-items-center rounded-full bg-elevated",
								onClick: () => void onSendChat(),
								"aria-label": "Send",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, { className: "size-4" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "grid size-12 shrink-0 place-items-center rounded-full bg-gold text-bg",
								onClick: () => setGiftsOpen(true),
								"aria-label": t("gifts"),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Gift, { className: "size-5" })
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-2 text-center text-[11px] text-muted",
						children: [
							profile?.coins ?? 0,
							" ",
							t("coins"),
							target ? ` · → ${targetName}` : ""
						]
					}),
					isHost && target ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-2 flex justify-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "min-h-10 rounded-lg border border-border bg-elevated px-3 text-xs font-semibold",
							onClick: () => void onKick(target),
							children: [
								t("kick"),
								" ",
								targetName
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "min-h-10 rounded-lg border border-border bg-elevated px-3 text-xs font-semibold",
							onClick: () => void toggleFollow({ data: { userId: target } }),
							children: t("follow")
						})]
					}) : null
				]
			}),
			giftsOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "fixed inset-0 z-50 grid place-items-end bg-bg/70 p-4 backdrop-blur-sm",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "w-full max-w-[448px] rounded-xl border border-border bg-surface p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "font-display text-xl font-semibold",
								children: t("gifts")
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "grid size-12 place-items-center rounded-full bg-elevated",
								onClick: () => setGiftsOpen(false),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-5" })
							})]
						}),
						!target ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm text-muted",
							children: t("pickSomeone")
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-3 grid grid-cols-4 gap-2",
							children: GIFTS.map((g) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								disabled: !target,
								className: "rounded-lg border border-border bg-elevated px-1 py-2 text-center",
								onClick: () => void onGift(g.id),
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-[22px] leading-none",
										children: g.emoji
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "mt-1 text-[10px]",
										children: lang === "bn" ? g.nameBn : g.nameEn
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-[10px] text-gold",
										children: g.cost
									})
								]
							}, g.id))
						}),
						err ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm text-danger",
							children: err
						}) : null
					]
				})
			}) : null
		]
	});
}
//#endregion
export { RoomPage as component };
