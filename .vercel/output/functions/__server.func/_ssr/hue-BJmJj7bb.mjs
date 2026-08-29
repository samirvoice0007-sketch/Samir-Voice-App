//#region node_modules/.nitro/vite/services/ssr/assets/hue-BJmJj7bb.js
function hueFrom(str) {
	let n = 0;
	const s = String(str || "");
	for (let i = 0; i < s.length; i++) n = (n + s.charCodeAt(i) * 17) % 360;
	return n;
}
function avatarGradient(hue) {
	const h = (hue % 360 + 360) % 360;
	return `linear-gradient(145deg, hsl(${h} 70% 42%), hsl(${(h + 40) % 360} 55% 22%))`;
}
//#endregion
export { hueFrom as n, avatarGradient as t };
