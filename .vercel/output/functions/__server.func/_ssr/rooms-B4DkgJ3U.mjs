import { o as __toESM } from "../_runtime.mjs";
import { H as require_react, S as require_jsx_runtime, b as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { f as useLang, n as AuthedShell } from "./app-shell-1_ZZ4i4K.mjs";
import { s as listRooms } from "./rooms-Cmi_E6oo.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/rooms-B4DkgJ3U.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function RoomsPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthedShell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RoomsInner, {}) });
}
function RoomsInner() {
	const t = useLang((s) => s.t);
	const navigate = useNavigate();
	const [rooms, setRooms] = (0, import_react.useState)([]);
	(0, import_react.useEffect)(() => {
		listRooms().then(setRooms).catch(() => setRooms([]));
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "px-4 pb-4 pt-5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "font-display text-2xl font-semibold",
			children: t("rooms")
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-4 flex flex-col gap-3",
			children: [rooms.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				className: "flex items-center justify-between gap-3 rounded-xl border border-border bg-elevated p-3.5 text-left",
				onClick: () => navigate({
					to: "/rooms/$id",
					params: { id: r.id }
				}),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "font-semibold",
					children: r.title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-xs text-muted",
					children: r.topic
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "rounded-pill bg-primary/25 px-2 py-1 text-[11px] font-bold text-gold",
					children: t("join")
				})]
			}, r.id)), !rooms.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: t("emptyRooms")
			}) : null]
		})]
	});
}
//#endregion
export { RoomsPage as component };
