import { r as createServerFn } from "./ssr.mjs";
import { r as getSql } from "./db-CvawacfL.mjs";
import { t as createServerRpc } from "./createServerRpc-CcvdN_gc.mjs";
import { createHash, randomBytes, randomInt } from "node:crypto";
//#region node_modules/.nitro/vite/services/ssr/assets/phone-auth-BFKaCtqj.js
function normalizePhone(raw) {
	const digits = String(raw || "").replace(/[^\d+]/g, "");
	if (!digits) return null;
	let p = digits;
	if (p.startsWith("00")) p = `+${p.slice(2)}`;
	if (p.startsWith("0") && p.length === 11) p = `+88${p}`;
	if (/^1\d{9}$/.test(p)) p = `+880${p}`;
	if (/^\d{13}$/.test(p) && p.startsWith("880")) p = `+${p}`;
	if (!p.startsWith("+")) p = `+${p}`;
	const just = p.replace(/\D/g, "");
	if (just.length < 10 || just.length > 15) return null;
	return `+${just}`;
}
function hashCode(phone, code) {
	return createHash("sha256").update(`${phone}:${code}:gfbf`).digest("hex");
}
function phoneEmail(phone) {
	return `p${phone.replace(/\D/g, "")}@phone.gfbf.app`;
}
var sendPhoneOtp_createServerFn_handler = createServerRpc({
	id: "e7a5ba3775540dd2a76c4697f7664353d4f29c36d6fcae2098cd7944a0e8d215",
	name: "sendPhoneOtp",
	filename: "src/lib/phone-auth.ts"
}, (opts) => sendPhoneOtp.__executeServer(opts));
var sendPhoneOtp = createServerFn({ method: "POST" }).validator((d) => d).handler(sendPhoneOtp_createServerFn_handler, async ({ data }) => {
	const phone = normalizePhone(data.phone);
	if (!phone) throw new Error("Enter a valid phone number");
	const sql = await getSql();
	const existing = await sql`
      select created_at from phone_otps where phone = ${phone} limit 1
    `;
	if (existing[0]) {
		if (Date.now() - new Date(existing[0].created_at).getTime() < 2e4) throw new Error("Wait a moment before resending");
	}
	const code = String(randomInt(1e5, 1e6));
	const expires = new Date(Date.now() + 6e5).toISOString();
	await sql`
      insert into phone_otps (phone, code_hash, attempts, expires_at, created_at)
      values (${phone}, ${hashCode(phone, code)}, 0, ${expires}, now())
      on conflict (phone) do update set
        code_hash = excluded.code_hash,
        attempts = 0,
        expires_at = excluded.expires_at,
        created_at = now()
    `;
	return {
		ok: true,
		phone,
		code
	};
});
var verifyPhoneOtp_createServerFn_handler = createServerRpc({
	id: "4bcf7497de85e9041cfa12b88a3daf6ca5e9f8e0cebda7f6fac13bf2ca20baa2",
	name: "verifyPhoneOtp",
	filename: "src/lib/phone-auth.ts"
}, (opts) => verifyPhoneOtp.__executeServer(opts));
var verifyPhoneOtp = createServerFn({ method: "POST" }).validator((d) => d).handler(verifyPhoneOtp_createServerFn_handler, async ({ data }) => {
	const phone = normalizePhone(data.phone);
	const code = String(data.code || "").replace(/\D/g, "");
	if (!phone || code.length !== 6) throw new Error("OTP is wrong or expired");
	const sql = await getSql();
	const row = (await sql`select code_hash, attempts, expires_at from phone_otps where phone = ${phone} limit 1`)[0];
	if (!row) throw new Error("OTP is wrong or expired");
	if (Number(row.attempts) >= 5) throw new Error("Too many attempts. Request a new code.");
	if (new Date(row.expires_at).getTime() < Date.now()) throw new Error("OTP is wrong or expired");
	if (row.code_hash !== hashCode(phone, code)) {
		await sql`update phone_otps set attempts = attempts + 1 where phone = ${phone}`;
		throw new Error("OTP is wrong or expired");
	}
	await sql`delete from phone_otps where phone = ${phone}`;
	const existing = await sql`select login_email, login_password, display_name from phone_accounts where phone = ${phone} limit 1`;
	if (existing[0]) return {
		email: existing[0].login_email,
		password: existing[0].login_password,
		name: existing[0].display_name,
		isNew: false
	};
	const email = phoneEmail(phone);
	const password = randomBytes(18).toString("base64url");
	const name = String(data.displayName || `User${phone.slice(-4)}`).trim().slice(0, 32) || `User${phone.slice(-4)}`;
	await sql`
        insert into phone_accounts (phone, login_email, login_password, display_name)
        values (${phone}, ${email}, ${password}, ${name})
        on conflict (phone) do nothing
      `;
	return {
		email,
		password,
		name,
		isNew: true
	};
});
//#endregion
export { sendPhoneOtp_createServerFn_handler, verifyPhoneOtp_createServerFn_handler };
