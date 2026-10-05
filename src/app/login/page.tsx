"use client";
import Image from "next/image";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";

function LoginForm() {
  const params = useSearchParams();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr("");
    const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: u, password: p }) });
    if (res.ok) window.location.href = params.get("next") || "/";
    else { setErr((await res.json()).error || "Login failed"); setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="card w-full max-w-sm p-7">
      <Image src="/logo.png" alt="Darshan University" width={170} height={63} className="h-14 w-auto" priority />
      <h1 className="mt-5 text-lg font-bold">Viva Management System</h1>
      <p className="text-sm text-slate-500">Sign in to manage external examiner bills</p>
      <div className="mt-6 space-y-4">
        <div><label className="label" htmlFor="u">Username</label>
          <input id="u" className="input" value={u} onChange={(e) => setU(e.target.value)} autoFocus required /></div>
        <div><label className="label" htmlFor="p">Password</label>
          <input id="p" type="password" className="input" value={p} onChange={(e) => setP(e.target.value)} required /></div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button className="btn-primary w-full" disabled={busy}><Lock size={16} /> {busy ? "Signing in..." : "Sign in"}</button>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen grid place-items-center p-4 bg-gradient-to-br from-brand-50 via-white to-slate-100">
      <Suspense><LoginForm /></Suspense>
    </div>
  );
}
