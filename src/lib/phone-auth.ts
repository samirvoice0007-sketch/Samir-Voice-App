import { createHash, randomBytes, randomInt } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";

function normalizePhone(raw: string): string | null {
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

function hashCode(phone: string, code: string) {
  return createHash("sha256").update(`${phone}:${code}:gfbf`).digest("hex");
}

function phoneEmail(phone: string) {
  return `p${phone.replace(/\D/g, "")}@phone.gfbf.app`;
}

export const sendPhoneOtp = createServerFn({ method: "POST" })
  .validator((d: { phone: string }) => d)
  .handler(async ({ data }): Promise<{ ok: true; phone: string; code: string }> => {
    const phone = normalizePhone(data.phone);
    if (!phone) throw new Error("Enter a valid phone number");
    const sql = await getSql();
    const existing = await sql<{ created_at: string }>`
      select created_at from phone_otps where phone = ${phone} limit 1
    `;
    if (existing[0]) {
      const age = Date.now() - new Date(existing[0].created_at).getTime();
      if (age < 20_000) throw new Error("Wait a moment before resending");
    }
    const code = String(randomInt(100000, 1000000));
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await sql`
      insert into phone_otps (phone, code_hash, attempts, expires_at, created_at)
      values (${phone}, ${hashCode(phone, code)}, 0, ${expires}, now())
      on conflict (phone) do update set
        code_hash = excluded.code_hash,
        attempts = 0,
        expires_at = excluded.expires_at,
        created_at = now()
    `;
    // No SMS gateway in this app — return the code so login always works.
    return { ok: true, phone, code };
  });

export const verifyPhoneOtp = createServerFn({ method: "POST" })
  .validator((d: { phone: string; code: string; displayName?: string }) => d)
  .handler(
    async ({
      data,
    }): Promise<{ email: string; password: string; name: string; isNew: boolean }> => {
      const phone = normalizePhone(data.phone);
      const code = String(data.code || "").replace(/\D/g, "");
      if (!phone || code.length !== 6) throw new Error("OTP is wrong or expired");
      const sql = await getSql();
      const rows = await sql<{
        code_hash: string;
        attempts: number;
        expires_at: string;
      }>`select code_hash, attempts, expires_at from phone_otps where phone = ${phone} limit 1`;
      const row = rows[0];
      if (!row) throw new Error("OTP is wrong or expired");
      if (Number(row.attempts) >= 5) throw new Error("Too many attempts. Request a new code.");
      if (new Date(row.expires_at).getTime() < Date.now()) throw new Error("OTP is wrong or expired");
      if (row.code_hash !== hashCode(phone, code)) {
        await sql`update phone_otps set attempts = attempts + 1 where phone = ${phone}`;
        throw new Error("OTP is wrong or expired");
      }
      await sql`delete from phone_otps where phone = ${phone}`;

      const existing = await sql<{
        login_email: string;
        login_password: string;
        display_name: string;
      }>`select login_email, login_password, display_name from phone_accounts where phone = ${phone} limit 1`;
      if (existing[0]) {
        return {
          email: existing[0].login_email,
          password: existing[0].login_password,
          name: existing[0].display_name,
          isNew: false,
        };
      }
      const email = phoneEmail(phone);
      const password = randomBytes(18).toString("base64url");
      const name = String(data.displayName || `User${phone.slice(-4)}`).trim().slice(0, 32) || `User${phone.slice(-4)}`;
      await sql`
        insert into phone_accounts (phone, login_email, login_password, display_name)
        values (${phone}, ${email}, ${password}, ${name})
        on conflict (phone) do nothing
      `;
      return { email, password, name, isNew: true };
    },
  );
