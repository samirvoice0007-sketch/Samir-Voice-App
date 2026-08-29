import { r as createServerFn } from "./ssr.mjs";
import { t as authMiddleware } from "./middleware-D8_1gsU1.mjs";
import { o as createSsrRpc } from "./app-shell-1_ZZ4i4K.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/rooms-Cmi_E6oo.js
var listRooms = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(createSsrRpc("a953c508121308f40fee15df3bd1de3e1e71218dd4f6cf04eb733f6b43684692"));
var createRoom = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(createSsrRpc("50fea19dea03f2a51f20c94ac43563bfe3fb1de56e58af98aabc64d377f78d22"));
var getRoom = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((d) => d).handler(createSsrRpc("49b99f319fc5c372ed45926ef645aa98b270fe27ddb6a500a5de66b4bcdfe162"));
var joinRoom = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(createSsrRpc("851cd4d66b2c4aafe2da5441abd79d8952676d69980e2b10a7695c575afc9c32"));
var leaveRoom = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(createSsrRpc("194a489c220f8d2049e20a96b09dbb03f6540edc8fbace7adc06d04eae6699a8"));
var takeSeat = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(createSsrRpc("c30c3462065eba47caf93bb0d2896e904d62b8863fd11935876ecb26b663bb52"));
var setMuted = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(createSsrRpc("4f7fa25141ad338ab17c505971dbfba75cfbc662f86120f471f9f279c4d3e379"));
var kickMember = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(createSsrRpc("c01c2126e5e26e8ec8b07d4aba77961d1eb3329e1ef06b2b5e6b46b484357988"));
var listMessages = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((d) => d).handler(createSsrRpc("6acef8402b3b63c2589bb3b7fe9c33bdff342c72787a7f102d0ef0ec7676adf2"));
var sendMessage = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(createSsrRpc("601d7689b49910671d15275287873bc2f31fe2e0fd3d957c8e0c44c112afba5e"));
var sendGift = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(createSsrRpc("9d5d7da320b66359e963a666c4f78966a9b8d9bafd413ac0d7fa5e9ec85108c5"));
//#endregion
export { leaveRoom as a, sendGift as c, takeSeat as d, kickMember as i, sendMessage as l, getRoom as n, listMessages as o, joinRoom as r, listRooms as s, createRoom as t, setMuted as u };
