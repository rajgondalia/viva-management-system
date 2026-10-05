"use client";
/** Shared UI primitives: Toasts, Confirm dialog, Modal, SearchSelect, Empty state */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, Search, X, XCircle } from "lucide-react";

/* ---------------- Toast + Confirm provider ---------------- */
type Toast = { id: number; kind: "ok" | "err"; text: string };
type ConfirmReq = { title: string; text: string; okLabel?: string; resolve: (v: boolean) => void };
const Ctx = createContext<{
  toast: (text: string, kind?: "ok" | "err") => void;
  confirm: (title: string, text: string, okLabel?: string) => Promise<boolean>;
}>({ toast: () => {}, confirm: async () => false });

export const useUI = () => useContext(Ctx);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmReq, setConfirmReq] = useState<ConfirmReq | null>(null);
  const toast = useCallback((text: string, kind: "ok" | "err" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "err" ? 6000 : 3000);
  }, []);
  const confirm = useCallback((title: string, text: string, okLabel?: string) =>
    new Promise<boolean>((resolve) => setConfirmReq({ title, text, okLabel, resolve })), []);
  const close = (v: boolean) => { confirmReq?.resolve(v); setConfirmReq(null); };
  const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[70] flex flex-col gap-2 w-[min(380px,calc(100vw-2rem))]">
        {toasts.map((t) => (
          <div key={t.id} role="status"
            className={`flex items-start gap-2 rounded-lg px-4 py-3 text-sm shadow-lg text-white ${t.kind === "ok" ? "bg-emerald-600" : "bg-red-600"}`}>
            {t.kind === "ok" ? <CheckCircle2 size={18} className="shrink-0" /> : <XCircle size={18} className="shrink-0" />}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
      {confirmReq && (
        <Modal title={confirmReq.title} onClose={() => close(false)} size="sm">
          <div className="flex gap-3">
            <div className="h-10 w-10 shrink-0 rounded-full bg-red-50 text-red-600 grid place-items-center"><AlertTriangle size={20} /></div>
            <p className="text-sm text-slate-600 pt-2">{confirmReq.text}</p>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => close(false)}>Cancel</button>
            <button className="btn-danger" onClick={() => close(true)} autoFocus>{confirmReq.okLabel || "Delete"}</button>
          </div>
        </Modal>
      )}
    </Ctx.Provider>
  );
}

/* ---------------- Modal ---------------- */
export function Modal({ title, onClose, children, size = "md" }:
  { title: string; onClose: () => void; children: React.ReactNode; size?: "sm" | "md" | "lg" }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  const w = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl" }[size];
  return (
    <div className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center bg-slate-900/40 p-4 overflow-y-auto"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`card w-full ${w} my-8`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="card-h">
          <h3 className="card-t">{title}</h3>
          <button className="btn-ghost" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/* ---------------- Searchable select (combobox) ---------------- */
export interface Option { value: number | string; label: string; sub?: string }

export function SearchSelect({ options, value, onChange, placeholder = "Select...", id, disabled }: {
  options: Option[]; value: number | string | null | undefined; onChange: (v: Option | null) => void;
  placeholder?: string; id?: string; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hi, setHi] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => String(o.value) === String(value));
  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return options.filter((o) => !s || o.label.toLowerCase().includes(s) || o.sub?.toLowerCase().includes(s)).slice(0, 100);
  }, [q, options]);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const pick = (o: Option) => { onChange(o); setOpen(false); setQ(""); };

  return (
    <div className="relative" ref={box}>
      <button type="button" id={id} disabled={disabled}
        className="input flex items-center justify-between text-left"
        onClick={() => { setOpen(!open); setHi(0); }}>
        <span className={selected ? "truncate" : "text-slate-400 truncate"}>
          {selected ? selected.label : placeholder}
          {selected?.sub && <span className="text-slate-400"> · {selected.sub}</span>}
        </span>
        <ChevronDown size={16} className="text-slate-400 shrink-0" />
      </button>
      {open && (
        <div className="absolute z-40 mt-1 w-full card p-1 shadow-lg">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input autoFocus className="input pl-8 py-1.5" placeholder="Type to search..." value={q}
              onChange={(e) => { setQ(e.target.value); setHi(0); }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(h + 1, filtered.length - 1)); }
                if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
                if (e.key === "Enter") { e.preventDefault(); if (filtered[hi]) pick(filtered[hi]); }
                if (e.key === "Escape") setOpen(false);
              }} />
          </div>
          <ul className="max-h-64 overflow-y-auto mt-1" role="listbox">
            {filtered.length === 0 && <li className="px-3 py-2 text-sm text-slate-400">No match</li>}
            {filtered.map((o, i) => (
              <li key={o.value} role="option" aria-selected={String(o.value) === String(value)}
                onMouseEnter={() => setHi(i)} onMouseDown={(e) => { e.preventDefault(); pick(o); }}
                className={`cursor-pointer rounded-md px-3 py-2 text-sm ${i === hi ? "bg-brand-50 text-brand-700" : ""}`}>
                <div className="font-medium">{o.label}</div>
                {o.sub && <div className="text-xs text-slate-500">{o.sub}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function Empty({ text, children }: { text: string; children?: React.ReactNode }) {
  return (
    <div className="py-14 text-center">
      <p className="text-sm text-slate-500">{text}</p>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

export function PageHeader({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        {sub && <p className="text-sm text-slate-500 mt-0.5">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}
