import { S as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as cn } from "./app-shell-1_ZZ4i4K.mjs";
import { t as avatarGradient } from "./hue-BJmJj7bb.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/avatar-B7vNoIcq.js
var import_jsx_runtime = require_jsx_runtime();
function Avatar({ name, hue, size = "md", live = false }) {
	const letter = (name || "S").charAt(0).toUpperCase();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn("grid shrink-0 place-items-center rounded-full font-semibold text-fg", size === "lg" ? "h-[72px] w-[72px] text-2xl" : size === "sm" ? "h-8 w-8 text-xs" : "h-12 w-12 text-base", live && "avatar-live"),
		style: { background: avatarGradient(hue) },
		children: letter
	});
}
//#endregion
export { Avatar as t };
