"use client";
/** Optional single-PDF upload field: upload -> returns DocumentID; view / replace / remove */
import { useRef, useState } from "react";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import { useUI } from "@/components/ui";

export function PdfField({ value, onChange }: { value: number | null; onChange: (id: number | null) => void }) {
  const { toast } = useUI();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");

  const upload = async (file?: File) => {
    if (!file) return;
    if (file.type && file.type !== "application/pdf") return toast("Only PDF files are allowed", "err");
    if (file.size > 4 * 1024 * 1024) return toast("PDF is larger than 4 MB - please compress it", "err");
    setBusy(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/documents", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      onChange(data.id); setName(file.name);
      toast("PDF uploaded - click Save / Update to keep it");
    } catch (e) { toast((e as Error).message, "err"); }
    setBusy(false);
    if (input.current) input.current.value = "";
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2.5">
      {value ? (
        <>
          <FileText size={18} className="text-red-600" />
          <a href={`/api/documents/${value}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-brand-600 hover:underline">
            {name || "View uploaded PDF"}
          </a>
          <button type="button" className="btn-ghost btn-sm" onClick={() => input.current?.click()} disabled={busy}>
            <Upload size={14} /> Replace
          </button>
          <button type="button" className="btn-ghost btn-sm text-red-600" onClick={() => { onChange(null); setName(""); }}>
            <Trash2 size={14} /> Remove
          </button>
        </>
      ) : (
        <button type="button" className="btn-secondary btn-sm" onClick={() => input.current?.click()} disabled={busy}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} {busy ? "Uploading..." : "Upload PDF"}
        </button>
      )}
      <span className="text-xs text-slate-400 ml-auto">Optional · single PDF · max 4 MB</span>
      <input ref={input} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
    </div>
  );
}

/** small "PDF" link for list tables */
export function DocLink({ id, label = "PDF" }: { id?: number | null; label?: string }) {
  if (!id) return <span className="text-xs text-slate-400">-</span>;
  return (
    <a href={`/api/documents/${id}`} target="_blank" rel="noreferrer"
      className="badge bg-red-50 text-red-700 hover:underline gap-1"><FileText size={12} /> {label}</a>
  );
}
