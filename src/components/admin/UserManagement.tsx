"use client";

import { useMemo, useState, type ReactNode } from "react";
import { UserControls, UserCreateForm } from "@/components/dashboard/Forms";
import { useTranslation } from "@/components/i18n/LanguageProvider";

type ManagedUser = { _id: string; name?: string; email?: string; role: string; status: string; setupInvitationEligible?: boolean };

// Render committed API responses immediately; a route refresh is not the save result.
export default function UserManagement({ users: initialUsers, role, q, children }: { users: ManagedUser[]; role: string; q: string; children: ReactNode }) {
  const [users, setUsers] = useState(initialUsers);
  const { language } = useTranslation();
  const english = language === "en";
  const visible = useMemo(() => users.filter(user => {
    const matchesRole = role === "all" || (role === "admin" ? ["admin", "super_admin"].includes(user.role) : user.role === role);
    return matchesRole && (!q || `${user.name || ""} ${user.email || ""}`.toLowerCase().includes(q.toLowerCase()));
  }), [users, role, q]);
  const update = (user: ManagedUser) => setUsers(previous => previous.map(item => item._id === user._id ? { ...item, ...user } : item));

  return <div className="grid gap-6">
    <UserCreateForm onCreated={user => setUsers(previous => [{ ...user, setupInvitationEligible: true }, ...previous.filter(item => item._id !== user._id)])} />
    <div className="card overflow-auto p-5">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{english ? "Manage users" : "إدارة المستخدمين"}</h1>
          <p className="mt-1 text-sm text-ink/60">{english ? "Use filters to find the accounts you need." : "استخدم الفلاتر للوصول للحسابات المطلوبة بسرعة."}</p>
        </div>
        <div className="rounded border border-line px-3 py-2 text-sm text-ink/70">{english ? "Results" : "النتائج"}: <b className="text-ink">{visible.length}</b></div>
      </div>
      {children}
      <table className="w-full min-w-[760px] text-sm">
        <thead><tr className="text-start">
          {(english ? ["Name", "Email", "Role", "Status", "Actions"] : ["الاسم", "البريد", "الدور", "الحالة", "إجراءات"]).map(label => <th className="text-start" key={label}>{label}</th>)}
        </tr></thead>
        <tbody>{visible.map(user => <tr key={user._id} className="border-t border-line">
          <td className="py-3">{user.name}</td><td>{user.email}</td><td>{user.role}</td><td>{user.status}</td>
          <td><UserControls user={user} onUpdated={update} /></td>
        </tr>)}</tbody>
      </table>
      {visible.length === 0 ? <p className="mt-4 rounded border border-line bg-slate-50 p-4 text-sm text-ink/70">{english ? "No matching accounts." : "لا توجد حسابات مطابقة."}</p> : null}
    </div>
  </div>;
}
