import { o as __toESM } from "../_runtime.mjs";
import { H as require_react, S as require_jsx_runtime, d as useRouterState, v as Link, y as Navigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as getServerFnById, i as TSS_SERVER_FUNCTION, r as createServerFn } from "./ssr.mjs";
import { t as authClient } from "./client-B40BzJxt.mjs";
import { t as authMiddleware } from "./middleware-D8_1gsU1.mjs";
import { a as Mic, c as Gift, n as UserRound, s as House } from "../_libs/lucide-react.mjs";
import { t as clsx } from "../_libs/clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { t as create } from "../_libs/zustand.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/app-shell-1_ZZ4i4K.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/**
* Current user + loading state. Same behavior in live preview and when deployed:
*   - Auth enabled -> the real signed-in user; `user` is `null` while
*                            the session resolves (`isPending: true`) and when
*                            signed out (`isPending: false`). Session comes from
*                            Better Auth `useSession()` → `/api/auth/get-session`
*                            (cookie when deployed; bearer in live preview).
*   - Auth disabled (`VITE_AUTH_ENABLED=false`) -> `DEV_USER`, never pending.
*
* Protect a route by waiting out `isPending` before acting on `user` —
* redirecting on `user: null` alone bounces signed-in visitors to sign-in on
* every hard reload:
*
*   import { RedirectToSignIn } from "@/lib/auth/gates";
*   const { user, isPending } = useCurrentUserState();
*   if (isPending) return null;              // still resolving — don't redirect yet
*   if (!user) return <RedirectToSignIn />;  // definitely signed out
*
* `authEnabled` is a module-level constant fixed at load, so the guarded hook
* call keeps a stable hook order across every render of a given component.
*/
function useCurrentUserState() {
	const { data, isPending } = authClient.useSession();
	const user = data?.user;
	return {
		user: user ? {
			id: user.id,
			displayName: user.name ?? null,
			primaryEmail: user.email ?? null,
			profileImageUrl: user.image ?? null,
			isDevFallback: false
		} : null,
		isPending
	};
}
/**
* Auth state components — plain wrappers around `useCurrentUserState()`.
*
* With auth on, visitors are signed out until they authenticate — in the sandbox
* live preview too, which does real sign-in. The shared dev user appears only
* when auth is disabled (`VITE_AUTH_ENABLED=false`, the shipped default).
* While the session is still resolving, gates that care about signed-out state
* render nothing so there's no signed-out flash on hard reload.
*/
/** Where `RedirectToSignIn` sends signed-out visitors. Create this route. */
var SIGN_IN_PATH = "/login";
/**
* Client-side redirect to the sign-in route (TanStack `<Navigate>` — NOT a full
* `window.location` reload). A hard navigation re-bootstraps the SPA and re-runs
* session loading, which feels like a second "Loading…" on /login.
*
* Guard routes by waiting out `isPending` first (see `use-current-user`), then
* render this.
*/
function RedirectToSignIn({ to = SIGN_IN_PATH }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigate, { to });
}
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
var STRINGS = {
	bn: {
		tagline: "প্রেম ও বন্ধুত্বের ভয়েস রুম",
		email: "ইমেইল",
		password: "পাসওয়ার্ড",
		name: "নাম",
		signIn: "সাইন ইন",
		signUp: "অ্যাকাউন্ট খুলুন",
		continueGoogle: "Google দিয়ে চালিয়ে যান",
		continueX: "X দিয়ে চালিয়ে যান",
		orEmail: "অথবা ইমেইল",
		orPhone: "অথবা ফোন OTP",
		phone: "ফোন নম্বর",
		phonePlaceholder: "+880 1XXXXXXXXX",
		sendOtp: "OTP পাঠান",
		resendOtp: "আবার OTP পাঠান",
		otp: "৬ সংখ্যার OTP",
		verifyOtp: "ভেরিফাই করুন",
		demoCode: "ভেরিফিকেশন কোড",
		home: "হোম",
		rooms: "রুম",
		wallet: "ওয়ালেট",
		profile: "প্রোফাইল",
		liveNow: "এখন লাইভ",
		createRoom: "রুম তৈরি",
		join: "জয়েন",
		listeners: "শুনছে",
		speaker: "স্পিকার",
		roomTitle: "রুমের নাম",
		topic: "টপিক",
		start: "পার্টি শুরু",
		leave: "লিভ",
		takeSeat: "সিট নিন",
		emptySeat: "খালি",
		chat: "কিছু বলুন…",
		gifts: "গিফট",
		coins: "কয়েন",
		charm: "চার্ম",
		level: "লেভেল",
		save: "সেভ",
		bio: "বায়ো",
		emptyRooms: "এখনও লাইভ রুম নেই। প্রথম পার্টি শুরু করুন।",
		emptyChat: "আগে হাই বলুন।",
		giftSent: "একটি গিফট পাঠিয়েছে",
		history: "গিফট হিস্ট্রি",
		noGifts: "এখনও গিফট নেই।",
		welcome: "স্বাগতম",
		daily: "ডেইলি বোনাস +৫০",
		claimed: "আজকের বোনাস নেওয়া হয়েছে",
		pickSomeone: "সিটে কাউকে বেছে নিন",
		needCoins: "কয়েন কম",
		close: "বন্ধ",
		loading: "লোড হচ্ছে…",
		signOut: "সাইন আউট",
		haveAccount: "অ্যাকাউন্ট আছে?",
		noAccount: "নতুন?",
		micOn: "মাইক চালু",
		micOff: "মাইক বন্ধ",
		kick: "কিক",
		following: "ফলো করছেন",
		follow: "ফলো",
		liveParty: "লাইভ পার্টি",
		connecting: "কানেক্ট হচ্ছে…",
		voiceReady: "ভয়েস রেডি",
		needMic: "মাইক অনুমতি দিন",
		invalidPhone: "সঠিক ফোন নম্বর দিন",
		invalidOtp: "OTP ভুল বা মেয়াদ শেষ",
		authFailed: "লগইন হয়নি। আবার চেষ্টা করুন।",
		passwordHint: "কমপক্ষে ৮ অক্ষর",
		saved: "সেভ হয়েছে",
		followers: "ফলোয়ার"
	},
	en: {
		tagline: "Voice rooms for couples & friends",
		email: "Email",
		password: "Password",
		name: "Display name",
		signIn: "Sign in",
		signUp: "Create account",
		continueGoogle: "Continue with Google",
		continueX: "Continue with X",
		orEmail: "or email",
		orPhone: "or phone OTP",
		phone: "Phone number",
		phonePlaceholder: "+880 1XXXXXXXXX",
		sendOtp: "Send OTP",
		resendOtp: "Resend OTP",
		otp: "6-digit OTP",
		verifyOtp: "Verify OTP",
		demoCode: "Verification code",
		home: "Home",
		rooms: "Rooms",
		wallet: "Wallet",
		profile: "Profile",
		liveNow: "Live now",
		createRoom: "Create room",
		join: "Join",
		listeners: "listening",
		speaker: "speakers",
		roomTitle: "Room name",
		topic: "Topic",
		start: "Start party",
		leave: "Leave",
		takeSeat: "Take seat",
		emptySeat: "Empty",
		chat: "Say something…",
		gifts: "Gifts",
		coins: "Coins",
		charm: "Charm",
		level: "Level",
		save: "Save",
		bio: "Bio",
		emptyRooms: "No live rooms yet. Start the first party.",
		emptyChat: "Be the first to say hi.",
		giftSent: "sent a gift",
		history: "Gift history",
		noGifts: "No gifts yet.",
		welcome: "Welcome",
		daily: "Daily bonus +50",
		claimed: "Bonus claimed today",
		pickSomeone: "Pick someone on a seat",
		needCoins: "Not enough coins",
		close: "Close",
		loading: "Loading…",
		signOut: "Sign out",
		haveAccount: "Already have an account?",
		noAccount: "New here?",
		micOn: "Mic on",
		micOff: "Mic off",
		kick: "Kick",
		following: "Following",
		follow: "Follow",
		liveParty: "Live party",
		connecting: "Connecting…",
		voiceReady: "Voice ready",
		needMic: "Allow microphone access",
		invalidPhone: "Enter a valid phone number",
		invalidOtp: "OTP is wrong or expired",
		authFailed: "Sign-in failed. Try again.",
		passwordHint: "At least 8 characters",
		saved: "Saved",
		followers: "Followers"
	}
};
function translate(lang, key) {
	return STRINGS[lang][key] ?? STRINGS.en[key] ?? key;
}
var KEY = "gfbf-lang";
function readLang() {
	if (typeof window === "undefined") return "bn";
	try {
		return window.localStorage.getItem(KEY) === "en" ? "en" : "bn";
	} catch {
		return "bn";
	}
}
var useLang = create((set, get) => ({
	lang: readLang(),
	setLang: (lang) => {
		try {
			window.localStorage.setItem(KEY, lang);
		} catch {}
		set({ lang });
	},
	t: (key) => translate(get().lang, key)
}));
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var ensureMyProfile = createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(createSsrRpc("f20902d2eaa967101cd1a347c3e03e2a5dba2bc1a2fc48b277bde945e34084ec"));
createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(createSsrRpc("8b3329c2a9c2e99309d3a0e052a1c2aee1122f0a67ed1d38fe5c39d12428d69e"));
var updateMyProfile = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(createSsrRpc("a67e0918c7815b04c0558e3948a83ca88260536e7bbb425772ad42d99cb44123"));
var claimDaily = createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(createSsrRpc("5d72d61a85a3d572351cb78d65d9b19d9a67b6e77ed8e039ce0e80d270e8a5ce"));
var giftHistory = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(createSsrRpc("81eff7155ff2c12ca49cedf41db250b08cfa5e6dec2ec2cd44dcb78b87327518"));
var toggleFollow = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(createSsrRpc("8fc5a39d7a9901f14631d1943b39ad72476f806786907ed9f81334a8e0150935"));
function Splash() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "grid min-h-dvh place-items-center bg-bg px-6",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "text-center",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "font-display text-3xl font-semibold tracking-tight text-primary",
				children: "GF BF"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm text-muted",
				children: "Loading…"
			})]
		})
	});
}
function AppFrame({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "relative mx-auto min-h-dvh w-full max-w-[480px] bg-bg",
		children
	});
}
function BottomNav() {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const t = useLang((s) => s.t);
	const items = [
		{
			to: "/",
			label: t("home"),
			icon: House,
			match: (p) => p === "/"
		},
		{
			to: "/rooms",
			label: t("rooms"),
			icon: Mic,
			match: (p) => p.startsWith("/rooms")
		},
		{
			to: "/wallet",
			label: t("wallet"),
			icon: Gift,
			match: (p) => p === "/wallet"
		},
		{
			to: "/profile",
			label: t("profile"),
			icon: UserRound,
			match: (p) => p === "/profile"
		}
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
		className: "fixed bottom-0 left-1/2 z-40 grid w-full max-w-[480px] -translate-x-1/2 grid-cols-4 border-t border-border bg-surface/90 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md",
		children: items.map((item) => {
			const active = item.match(pathname);
			const Icon = item.icon;
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
				to: item.to,
				className: cn("flex min-h-12 flex-col items-center justify-center gap-0.5 text-[11px] font-medium", active ? "text-gold" : "text-muted"),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
					className: "size-5",
					strokeWidth: active ? 2.2 : 1.8
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item.label })]
			}, item.to);
		})
	});
}
function AuthedShell({ children, nav = true }) {
	const { user, isPending } = useCurrentUserState();
	const [profile, setProfile] = (0, import_react.useState)(null);
	const [ready, setReady] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (isPending || !user) return;
		let alive = true;
		ensureMyProfile().then((p) => {
			if (alive) setProfile(p);
		}).catch(() => {
			if (alive) setProfile(null);
		}).finally(() => {
			if (alive) setReady(true);
		});
		return () => {
			alive = false;
		};
	}, [isPending, user]);
	if (isPending) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Splash, {});
	if (!user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RedirectToSignIn, {});
	if (!ready) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Splash, {});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AppFrame, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: nav ? "pb-24" : "",
		children
	}), nav ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BottomNav, {}) : null] });
}
//#endregion
export { cn as a, giftHistory as c, useCurrentUserState as d, useLang as f, claimDaily as i, toggleFollow as l, AuthedShell as n, createSsrRpc as o, Splash as r, ensureMyProfile as s, AppFrame as t, updateMyProfile as u };
