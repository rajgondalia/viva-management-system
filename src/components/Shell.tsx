"use client";
/** App shell: left sidebar menu (+ department / user box) + top bar (mobile) + page content */
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import {
  BookOpen, Building2, CreditCard, FilePlus2, Fuel, GraduationCap, History, KeyRound, LayoutDashboard, LogOut,
  Menu, Settings, ShieldCheck, Users, X,
} from "lucide-react";
import { Modal, UIProvider, useUI } from "@/components/ui";
import { api } from "@/lib/client";

export interface Me { username: string; name: string; role: "admin" | "user"; deptId: number | null; deptName: string;
  departments: { id: number; name: string }[] }
const MeCtx = createContext<Me | null>(null);
export const useMe = () => useContext(MeCtx);

const MENU = [
  { group: "", items: [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/bills/new", label: "Create New Bill", icon: FilePlus2 },
    { href: "/bills", label: "Bill History", icon: History },
  ]},
  { group: "Masters", items: [
    { href: "/faculty", label: "Add Faculty / Staff", icon: Users },
    { href: "/colleges", label: "Add College", icon: Building2 },
    { href: "/fuel-types", label: "Add Fuel Type", icon: Fuel },
    { href: "/bank-details", label: "Bank Details", icon: CreditCard },
    { href: "/courses", label: "Add Course", icon: GraduationCap },
    { href: "/subjects", label: "Course-wise Subjects", icon: BookOpen },
  ]},
  { group: "System", items: [
    { href: "/settings", label: "Settings & Rules", icon: Settings },
    { href: "/users", label: "Users & Departments", icon: ShieldCheck, admin: true },
  ]},
];

export function Shell({ children }: { children: React.ReactNode }) {
  return <UIProvider><ShellInner>{children}</ShellInner></UIProvider>;
}

function ShellInner({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { toast } = useUI();
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [pw, setPw] = useState(false);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => { api<Me>("/api/auth/me").then(setMe).catch(() => {}); }, []);

  const isActive = (href: string) =>
    href === "/" ? path === "/" : href === "/bills" ? path === "/bills" || /^\/bills\/\d+/.test(path) : path.startsWith(href);

  const logout = async () => { await fetch("/api/auth/logout", { method: "POST" }); router.push("/login"); };
  const switchDept = async (id: number) => {
    try { await api("/api/auth/department", { method: "POST", json: { departmentId: id } }); window.location.reload(); }
    catch (e) { toast((e as Error).message, "err"); }
  };

  const nav = (
    <nav className="flex h-full flex-col">
      <div className="px-5 pt-5 pb-4 border-b border-slate-100">
        <Image src="/logo.png" alt="Darshan University" width={150} height={56} priority className="h-11 w-auto" />
        <p className="mt-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Viva Management</p>
        {me && (
          <div className="mt-3">
            {me.role === "admin" && me.departments.length > 0 ? (
              <select aria-label="Department" className="input py-1.5 text-sm font-semibold text-brand-700" value={me.deptId ?? ""}
                onChange={(e) => switchDept(Number(e.target.value))}>
                {!me.deptId && <option value="">Select department</option>}
                {me.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            ) : (
              <div className="rounded-lg bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700">{me.deptName || "No department"}</div>
            )}
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {MENU.map((g) => (
          <div key={g.group || "main"}>
            {g.group && <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{g.group}</p>}
            <ul className="space-y-0.5">
              {g.items.filter((i) => !("admin" in i && i.admin) || me?.role === "admin").map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link href={href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      isActive(href) ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}>
                    <Icon size={18} /> {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-100 p-3 space-y-0.5">
        {me && (
          <div className="px-3 pb-2">
            <div className="text-sm font-semibold text-slate-800 truncate">{me.name}</div>
            <div className="text-xs text-slate-500">{me.username} · {me.role === "admin" ? "Admin" : "Department user"}</div>
          </div>
        )}
        {me && me.username && me.name !== "Super Admin" && (
          <button onClick={() => setPw(true)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
            <KeyRound size={18} /> Change password
          </button>
        )}
        <button onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
          <LogOut size={18} /> Logout
        </button>
      </div>
    </nav>
  );

  return (
    <MeCtx.Provider value={me}>
      <div className="min-h-screen lg:pl-64">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white lg:block">{nav}</aside>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
            <aside className="absolute inset-y-0 left-0 w-64 bg-white shadow-xl">
              <button className="btn-ghost absolute right-2 top-2" onClick={() => setOpen(false)} aria-label="Close menu"><X size={18} /></button>
              {nav}
            </aside>
          </div>
        )}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/90 backdrop-blur px-4 py-2.5 lg:hidden">
          <button className="btn-ghost" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <span className="font-semibold">Viva Management</span>
          {me?.deptName && <span className="ml-auto badge bg-brand-50 text-brand-700">{me.deptName}</span>}
        </header>
        <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
      {pw && <PasswordDialog onClose={() => setPw(false)} />}
    </MeCtx.Provider>
  );
}

function PasswordDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useUI();
  const [f, setF] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.newPassword !== f.confirm) return toast("New passwords do not match", "err");
    try { await api("/api/auth/password", { method: "POST", json: f }); toast("Password changed"); onClose(); }
    catch (err) { toast((err as Error).message, "err"); }
  };
  return (
    <Modal title="Change password" onClose={onClose} size="sm">
      <form onSubmit={save} className="space-y-3">
        {([["currentPassword", "Current password"], ["newPassword", "New password (min 6)"], ["confirm", "Confirm new password"]] as const).map(([k, l]) => (
          <div key={k}><label className="label" htmlFor={k}>{l}</label>
            <input id={k} type="password" className="input" required value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>
        ))}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary">Save</button>
        </div>
      </form>
    </Modal>
  );
}
