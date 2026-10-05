"use client";
/** Admin: departments + department-wise login users */
import { useCallback, useEffect, useState } from "react";
import { Building, Pencil, Plus, Trash2, UserPlus } from "lucide-react";
import { Empty, Modal, PageHeader, useUI } from "@/components/ui";
import { api } from "@/lib/client";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function UsersPage() {
  const { toast, confirm } = useUI();
  const [depts, setDepts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [dept, setDept] = useState<any | null>(null);
  const [user, setUser] = useState<any | null>(null);

  const load = useCallback(async () => {
    try {
      const [d, u] = await Promise.all([api<any[]>("/api/admin/departments"), api<any[]>("/api/admin/users")]);
      setDepts(d); setUsers(u);
    } catch (e) { toast((e as Error).message, "err"); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const saveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api(dept.id ? `/api/admin/departments/${dept.id}` : "/api/admin/departments", { method: dept.id ? "PUT" : "POST", json: dept });
      toast(dept.id ? "Department updated" : "Department added (default fuel types & settings created)");
      setDept(null); load();
    } catch (err) { toast((err as Error).message, "err"); }
  };
  const saveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api(user.id ? `/api/admin/users/${user.id}` : "/api/admin/users", { method: user.id ? "PUT" : "POST", json: user });
      toast(user.id ? "User updated" : "User created"); setUser(null); load();
    } catch (err) { toast((err as Error).message, "err"); }
  };
  const del = async (kind: "departments" | "users", r: any) => {
    if (!(await confirm(`Delete ${kind === "users" ? "user" : "department"}?`, `"${r.name ?? r.username}" will be deleted permanently.`))) return;
    try { await api(`/api/admin/${kind}/${r.id}`, { method: "DELETE" }); toast("Deleted"); load(); }
    catch (err) { toast((err as Error).message, "err"); }
  };

  return (
    <div>
      <PageHeader title="Users & Departments" sub="Each department has its own login and sees only its own faculty, bills and dashboard" />

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <section className="card xl:col-span-2">
          <div className="card-h"><h2 className="card-t flex items-center gap-2"><Building size={18} /> Departments</h2>
            <button className="btn-primary btn-sm" onClick={() => setDept({ name: "", description: "" })}><Plus size={14} /> Add</button></div>
          {depts.length === 0 ? <Empty text="No departments" /> : (
            <table className="tbl">
              <thead><tr><th>Department</th><th className="num">Users</th><th className="num">Bills</th><th /></tr></thead>
              <tbody>{depts.map((d) => (
                <tr key={d.id}>
                  <td><div className="font-medium">{d.name}</div>{d.description && <div className="text-xs text-slate-500">{d.description}</div>}</td>
                  <td className="num">{d.users}</td><td className="num">{d.bills}</td>
                  <td className="text-right whitespace-nowrap">
                    <button className="btn-ghost btn-sm" aria-label="Edit" onClick={() => setDept({ ...d })}><Pencil size={15} /></button>
                    <button className="btn-ghost btn-sm text-red-600" aria-label="Delete" onClick={() => del("departments", d)}><Trash2 size={15} /></button>
                  </td>
                </tr>))}</tbody>
            </table>
          )}
        </section>

        <section className="card xl:col-span-3">
          <div className="card-h"><h2 className="card-t flex items-center gap-2"><UserPlus size={18} /> Login users</h2>
            <button className="btn-primary btn-sm" disabled={!depts.length}
              onClick={() => setUser({ username: "", fullName: "", password: "", role: "user", departmentId: depts[0]?.id, isActive: true })}>
              <Plus size={14} /> Add user</button></div>
          {users.length === 0 ? <Empty text="No users yet. Add a login for each department (e.g. dietcse, dietds)." /> : (
            <div className="overflow-x-auto"><table className="tbl">
              <thead><tr><th>Username</th><th>Name</th><th>Department</th><th>Role</th><th>Status</th><th /></tr></thead>
              <tbody>{users.map((u) => (
                <tr key={u.id}>
                  <td className="font-mono text-xs">{u.username}</td><td>{u.fullName}</td>
                  <td>{u.departmentName ?? <span className="text-slate-400">All</span>}</td>
                  <td><span className={`badge ${u.role === "admin" ? "bg-violet-50 text-violet-700" : "bg-slate-100 text-slate-700"}`}>{u.role === "admin" ? "Admin" : "Department user"}</span></td>
                  <td>{u.isActive ? <span className="badge bg-emerald-50 text-emerald-700">Active</span> : <span className="badge bg-slate-100 text-slate-500">Disabled</span>}</td>
                  <td className="text-right whitespace-nowrap">
                    <button className="btn-ghost btn-sm" aria-label="Edit" onClick={() => setUser({ ...u, password: "" })}><Pencil size={15} /></button>
                    <button className="btn-ghost btn-sm text-red-600" aria-label="Delete" onClick={() => del("users", u)}><Trash2 size={15} /></button>
                  </td>
                </tr>))}</tbody>
            </table></div>
          )}
        </section>
      </div>

      <p className="mt-4 text-xs text-slate-500">
        The super admin login comes from ADMIN_USERNAME / ADMIN_PASSWORD in the environment settings and can switch between all departments from the side menu.
      </p>

      {dept && (
        <Modal title={dept.id ? "Edit department" : "Add department"} onClose={() => setDept(null)} size="sm">
          <form onSubmit={saveDept} className="space-y-3">
            <div><label className="label" htmlFor="dn">Department name *</label>
              <input id="dn" className="input" required placeholder="DIET DS" value={dept.name} onChange={(e) => setDept({ ...dept, name: e.target.value })} /></div>
            <div><label className="label" htmlFor="dd">Description</label>
              <input id="dd" className="input" placeholder="Diploma - Data Science" value={dept.description} onChange={(e) => setDept({ ...dept, description: e.target.value })} /></div>
            <div className="flex justify-end gap-2 pt-2"><button type="button" className="btn-secondary" onClick={() => setDept(null)}>Cancel</button><button className="btn-primary">Save</button></div>
          </form>
        </Modal>
      )}
      {user && (
        <Modal title={user.id ? "Edit user" : "Add user"} onClose={() => setUser(null)}>
          <form onSubmit={saveUser} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label" htmlFor="un">Username *</label>
              <input id="un" className="input" required placeholder="dietcse" value={user.username} onChange={(e) => setUser({ ...user, username: e.target.value })} /></div>
            <div><label className="label" htmlFor="fn">Full name</label>
              <input id="fn" className="input" placeholder="DIET CSE Office" value={user.fullName} onChange={(e) => setUser({ ...user, fullName: e.target.value })} /></div>
            <div><label className="label" htmlFor="role">Role</label>
              <select id="role" className="input" value={user.role} onChange={(e) => setUser({ ...user, role: e.target.value })}>
                <option value="user">Department user (own department only)</option>
                <option value="admin">Admin (all departments + users)</option>
              </select></div>
            <div><label className="label" htmlFor="ud">Department {user.role === "user" && "*"}</label>
              <select id="ud" className="input" value={user.departmentId ?? ""} onChange={(e) => setUser({ ...user, departmentId: Number(e.target.value) || null })}>
                {user.role === "admin" && <option value="">All (choose after login)</option>}
                {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select></div>
            <div><label className="label" htmlFor="pw">{user.id ? "New password (leave blank to keep)" : "Password * (min 6)"}</label>
              <input id="pw" type="password" className="input" required={!user.id} minLength={6} value={user.password} onChange={(e) => setUser({ ...user, password: e.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm mt-6">
              <input type="checkbox" className="h-4 w-4 accent-brand-500" checked={user.isActive} onChange={(e) => setUser({ ...user, isActive: e.target.checked })} /> Active (can log in)
            </label>
            <div className="sm:col-span-2 flex justify-end gap-2 pt-2"><button type="button" className="btn-secondary" onClick={() => setUser(null)}>Cancel</button><button className="btn-primary">Save</button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}
