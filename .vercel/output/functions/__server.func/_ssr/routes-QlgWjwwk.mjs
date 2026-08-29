import { o as __toESM } from "../_runtime.mjs";
import { H as require_react, S as require_jsx_runtime, b as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { d as useCurrentUserState, f as useLang, n as AuthedShell, s as ensureMyProfile } from "./app-shell-1_ZZ4i4K.mjs";
import { t as LangToggle } from "./lang-toggle-BOpFPPV3.mjs";
import { n as Field } from "./field-DocRL8aU.mjs";
import { s as listRooms, t as createRoom } from "./rooms-Cmi_E6oo.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-QlgWjwwk.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function HomePage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthedShell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HomeInner, {}) });
}
function HomeInner() {
	const { user } = useCurrentUserState();
	const t = useLang((s) => s.t);
	const navigate = useNavigate();
	const [profile, setProfile] = (0, import_react.useState)(null);
	const [rooms, setRooms] = (0, import_react.useState)([]);
	const [open, setOpen] = (0, import_react.useState)(false);
	const [title, setTitle] = (0, import_react.useState)("");
	const [topic, setTopic] = (0, import_react.useState)("");
	const [err, setErr] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		let alive = true;
		Promise.all([ensureMyProfile(), listRooms()]).then(([p, r]) => {
			if (!alive) return;
			setProfile(p);
			setRooms(r);
		}).catch(() => {});
		return () => {
			alive = false;
		};
	}, []);
	async function onCreate() {
		setErr("");
		setBusy(true);
		try {
			const room = await createRoom({ data: {
				title,
				topic
			} });
			navigate({
				to: "/rooms/$id",
				params: { id: room.id }
			});
		} catch (e) {
			setErr(e instanceof Error ? e.message : "Could not create room");
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "px-4 pb-4 pt-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-[11px] font-semibold uppercase tracking-[0.18em] text-gold",
					children: t("liveParty")
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-display text-[2rem] font-semibold tracking-tight text-primary",
					children: "GF BF"
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LangToggle, {})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-4 rounded-xl border border-border bg-surface p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-[13px] text-muted",
						children: t("welcome")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-lg font-semibold",
						children: profile?.displayName || user?.displayName || "Star"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-2 flex gap-4 text-[13px]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "tabular-nums text-gold",
								children: profile?.coins ?? 0
							}),
							" ",
							t("coins")
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "tabular-nums text-primary",
								children: profile?.charm ?? 0
							}),
							" ",
							t("charm")
						] })]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-6 flex items-center justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-sm font-semibold text-muted",
					children: t("liveNow")
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold",
					onClick: () => setOpen(true),
					children: t("createRoom")
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 flex flex-col gap-3",
				children: [!rooms.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "rounded-xl border border-border bg-surface p-4 text-sm text-muted",
					children: t("emptyRooms")
				}) : null, rooms.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "rounded-xl border border-border bg-elevated p-3.5 text-left",
					onClick: () => navigate({
						to: "/rooms/$id",
						params: { id: r.id }
					}),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-start justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "font-semibold",
							children: r.title
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs text-muted",
							children: r.topic
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "rounded-pill bg-primary/25 px-2 py-1 text-[11px] font-bold text-gold",
							children: "LIVE"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-2 text-xs text-muted",
						children: [
							r.people,
							" ",
							t("listeners"),
							" · ",
							r.speakers,
							" ",
							t("speaker")
						]
					})]
				}, r.id))]
			}),
			open ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "fixed inset-0 z-50 grid place-items-end bg-bg/70 p-4 backdrop-blur-sm",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "w-full max-w-[448px] rounded-xl border border-border bg-surface p-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-xl font-semibold",
						children: t("createRoom")
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 flex flex-col gap-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								placeholder: t("roomTitle"),
								value: title,
								onChange: (e) => setTitle(e.target.value)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								placeholder: t("topic"),
								value: topic,
								onChange: (e) => setTopic(e.target.value)
							}),
							err ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-danger",
								children: err
							}) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex gap-2.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "min-h-11 flex-1 rounded-lg border border-border bg-elevated font-semibold",
									onClick: () => setOpen(false),
									children: t("close")
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: busy,
									className: "min-h-11 flex-1 rounded-lg bg-primary font-semibold",
									onClick: onCreate,
									children: t("start")
								})]
							})
						]
					})]
				})
			}) : null
		]
	});
}
//#endregion
export { HomePage as component };
