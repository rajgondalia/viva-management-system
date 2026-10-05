/**
 * Signed session cookie (HMAC-SHA256 via Web Crypto - works in middleware (edge) and API routes).
 * Cookie value = base64url(JSON payload) + "." + hex signature
 */
export const SESSION_COOKIE = "vms_session";
export const SESSION_DAYS = 7;

export interface Session {
  uid: number;              // 0 = built-in super admin from env
  username: string;
  name: string;
  role: "admin" | "user";   // admin: user management + all departments
  deptId: number | null;    // active department
  deptName: string;
  exp: number;              // unix ms
}

const secret = () => process.env.AUTH_SECRET || "viva-management-default-secret";
const enc = new TextEncoder();

function b64url(s: string) {
  const b = btoa(unescape(encodeURIComponent(s)));
  return b.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function unb64url(s: string) {
  const b = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  return decodeURIComponent(escape(atob(b)));
}
async function hmac(data: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Array.from(new Uint8Array(sig)).map((x) => x.toString(16).padStart(2, "0")).join("");
}

export async function signSession(s: Omit<Session, "exp">) {
  const payload = b64url(JSON.stringify({ ...s, exp: Date.now() + SESSION_DAYS * 864e5 }));
  return `${payload}.${await hmac(payload)}`;
}

export async function verifySession(token?: string | null): Promise<Session | null> {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = await hmac(payload);
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return null;
  try {
    const s = JSON.parse(unb64url(payload)) as Session;
    return s.exp > Date.now() ? s : null;
  } catch { return null; }
}

export const cookieOptions = {
  httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production",
  path: "/", maxAge: SESSION_DAYS * 86400,
};
