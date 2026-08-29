import { o as __toESM } from "../_runtime.mjs";
import { H as require_react, S as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { i as signOut } from "./client-B40BzJxt.mjs";
import { a as cn, d as useCurrentUserState, f as useLang, n as AuthedShell, s as ensureMyProfile, u as updateMyProfile } from "./app-shell-1_ZZ4i4K.mjs";
import { n as Field, t as Area } from "./field-DocRL8aU.mjs";
import { t as Avatar } from "./avatar-B7vNoIcq.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/profile-DqqU53bB.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ProfilePage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthedShell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProfileInner, {}) });
}
function ProfileInner() {
	const { user } = useCurrentUserState();
	const t = useLang((s) => s.t);
	const lang = useLang((s) => s.lang);
	const setLang = useLang((s) => s.setLang);
	const [profile, setProfile] = (0, import_react.useState)(null);
	const [name, setName] = (0, import_react.useState)("");
	const [bio, setBio] = (0, import_react.useState)("");
	const [msg, setMsg] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		ensureMyProfile().then((p) => {
			setProfile(p);
			setName(p.displayName);
			setBio(p.bio);
		});
	}, []);
	async function onSave() {
		setBusy(true);
		try {
			const p = await updateMyProfile({ data: {
				displayName: name,
				bio,
				lang
			} });
			setProfile(p);
			setMsg(t("saved"));
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "px-4 pb-4 pt-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-display text-2xl font-semibold",
					children: t("profile")
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "min-h-11 rounded-lg border border-border bg-elevated px-4 text-sm font-semibold",
					onClick: () => void signOut().catch(() => {}),
					children: t("signOut")
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-6 text-center",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex justify-center",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
							name: name || profile?.displayName || "S",
							hue: profile?.avatarHue ?? 320,
							size: "lg"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-2 text-sm text-muted",
						children: [
							t("level"),
							" ",
							profile?.level ?? 1,
							" · XP ",
							profile?.xp ?? 0
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 text-xs text-muted",
						children: [
							profile?.followers ?? 0,
							" ",
							t("followers")
						]
					}),
					user?.primaryEmail ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-xs text-muted",
						children: user.primaryEmail
					}) : null
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-6 flex flex-col gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						value: name,
						onChange: (e) => setName(e.target.value),
						placeholder: t("name")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
						rows: 3,
						value: bio,
						onChange: (e) => setBio(e.target.value),
						placeholder: t("bio")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-2.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: cn("min-h-11 flex-1 rounded-lg font-semibold", lang === "bn" ? "bg-primary" : "border border-border bg-elevated"),
							onClick: () => setLang("bn"),
							children: "বাংলা"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: cn("min-h-11 flex-1 rounded-lg font-semibold", lang === "en" ? "bg-primary" : "border border-border bg-elevated"),
							onClick: () => setLang("en"),
							children: "English"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						disabled: busy,
						className: "min-h-11 w-full rounded-lg bg-gold text-sm font-semibold text-bg",
						onClick: onSave,
						children: t("save")
					}),
					msg ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-center text-sm text-muted",
						children: msg
					}) : null
				]
			})
		]
	});
}
//#endregion
export { ProfilePage as component };
