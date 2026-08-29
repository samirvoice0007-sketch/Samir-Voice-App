import { S as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as cn } from "./app-shell-1_ZZ4i4K.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/field-DocRL8aU.js
var import_jsx_runtime = require_jsx_runtime();
var fieldClass = "min-h-11 w-full rounded-lg border border-border bg-elevated px-3.5 py-3 text-sm text-fg outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted/70 focus:border-primary";
function Field(props) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
		...props,
		className: cn(fieldClass, props.className)
	});
}
function Area(props) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
		...props,
		className: cn(fieldClass, "min-h-24 resize-none", props.className)
	});
}
//#endregion
export { Field as n, Area as t };
