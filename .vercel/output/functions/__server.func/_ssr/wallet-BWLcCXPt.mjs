import { o as __toESM } from "../_runtime.mjs";
import { H as require_react, S as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as giftHistory, f as useLang, i as claimDaily, n as AuthedShell, s as ensureMyProfile } from "./app-shell-1_ZZ4i4K.mjs";
import { t as GIFTS } from "./gifts-B-a4BAi4.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/wallet-BWLcCXPt.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function WalletPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthedShell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WalletInner, {}) });
}
function WalletInner() {
	const t = useLang((s) => s.t);
	const lang = useLang((s) => s.lang);
	const [profile, setProfile] = (0, import_react.useState)(null);
	const [hist, setHist] = (0, import_react.useState)([]);
	const [msg, setMsg] = (0, import_react.useState)("");
	(0, import_react.useEffect)(() => {
		Promise.all([ensureMyProfile(), giftHistory()]).then(([p, h]) => {
			setProfile(p);
			setHist(h);
		});
	}, []);
	async function onDaily() {
		const res = await claimDaily();
		setMsg(res.message === "already" ? t("claimed") : t("daily"));
		const p = await ensureMyProfile();
		setProfile(p);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "px-4 pb-4 pt-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-2xl font-semibold",
				children: t("wallet")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 grid grid-cols-2 gap-2.5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-xl border border-border bg-surface p-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-xs text-muted",
						children: t("coins")
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "font-display text-[2rem] tabular-nums text-gold",
						children: profile?.coins ?? 0
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-xl border border-border bg-surface p-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-xs text-muted",
						children: t("charm")
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "font-display text-[2rem] tabular-nums text-primary",
						children: profile?.charm ?? 0
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "mt-4 min-h-11 w-full rounded-lg bg-gold px-4 text-sm font-semibold text-bg",
				onClick: onDaily,
				children: t("daily")
			}),
			msg ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-center text-sm text-muted",
				children: msg
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "mt-6 text-sm font-semibold text-muted",
				children: t("gifts")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-2 grid grid-cols-4 gap-2",
				children: GIFTS.map((g) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-lg border border-border bg-elevated px-1 py-2 text-center",
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
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "mt-6 text-sm font-semibold text-muted",
				children: t("history")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-2 flex flex-col gap-2",
				children: [!hist.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: t("noGifts")
				}) : null, hist.map((h) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
						h.emoji,
						" ",
						lang === "bn" ? h.nameBn : h.nameEn
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "tabular-nums text-gold",
						children: h.cost
					})]
				}, h.id))]
			})
		]
	});
}
//#endregion
export { WalletPage as component };
