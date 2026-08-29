//#region node_modules/.nitro/vite/services/ssr/assets/ids-BspsANa3.js
/** Signaling-safe id: letters, digits, underscore, hyphen; max 64. */
function newId(prefix = "r") {
	return `${prefix}${Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6)}`.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
}
function peerIdFromUser(userId) {
	return (String(userId).replace(/[^a-zA-Z0-9_-]/g, "") || "peer").slice(0, 64);
}
function signalRoom(kind, roomId) {
	return `${kind}_${String(roomId).replace(/[^a-zA-Z0-9_-]/g, "")}`.slice(0, 64);
}
//#endregion
export { peerIdFromUser as n, signalRoom as r, newId as t };
