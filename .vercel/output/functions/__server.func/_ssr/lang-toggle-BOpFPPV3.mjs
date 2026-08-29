import { S as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as cn, f as useLang } from "./app-shell-1_ZZ4i4K.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/lang-toggle-BOpFPPV3.js
var import_jsx_runtime = require_jsx_runtime();
function LangToggle() {
	const lang = useLang((s) => s.lang);
	const setLang = useLang((s) => s.setLang);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "inline-flex rounded-pill border border-border bg-elevated p-0.5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			className: cn("min-h-8 rounded-pill px-2.5 text-xs font-semibold text-muted transition-colors duration-150", lang === "bn" && "bg-primary text-fg"),
			onClick: () => setLang("bn"),
			children: "বাং"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			className: cn("min-h-8 rounded-pill px-2.5 text-xs font-semibold text-muted transition-colors duration-150", lang === "en" && "bg-primary text-fg"),
			onClick: () => setLang("en"),
			children: "EN"
		})]
	});
}
//#endregion
export { LangToggle as t };
