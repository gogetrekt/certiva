import { redirect } from "next/navigation";

import { AdminStatusForm } from "../../../components/admin-status-form";
import { CreateAdminForm } from "../../../components/create-admin-form";
import {
  getCurrentAdmin,
  getSessionToken,
  getTeamAdmins,
} from "../../../lib/api";
import { formatDate } from "../../../lib/date-format";

export default async function TeamPage() {
  const token = await getSessionToken();
  if (!token) return null;

  const [admin, team] = await Promise.all([
    getCurrentAdmin(token),
    getTeamAdmins(token),
  ]);
  if (admin.role !== "OWNER" && admin.role !== "SUPER_ADMIN") redirect("/dashboard");

  return (
    <div className="space-y-6">
      {/* ── Page header ──────────────────────────────── */}
      <div className="pb-5 border-b border-[hsl(var(--border-default))]">
        <p className="kicker mb-2">Administrators</p>
        <h1 className="page-title">Administrators</h1>
        <p className="body-text mt-2">
          Manage institution operator accounts and permissions
        </p>
      </div>

      {/* ── Split layout ─────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        {/* Team table */}
        <div className="work-surface overflow-hidden p-0">
          <div className="px-6 py-5 border-b border-[hsl(var(--border-default))]">
            <p className="kicker mb-1">Current team</p>
            <h2 className="section-title">Authorized accounts</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="th-cell">Account</th>
                  <th className="th-cell">Role</th>
                  <th className="th-cell">Status</th>
                  <th className="th-cell">Actions</th>
                </tr>
              </thead>
              <tbody>
                {team.map((member) => (
                  <tr key={member.id}>
                    <td className="td-cell">
                      <p className="text-sm font-medium text-[hsl(var(--text-primary))]">
                        @{member.username ?? member.email.split("@")[0]}
                      </p>
                      <p className="meta-text mt-0.5">
                        Added {formatDate(member.createdAt)}
                      </p>
                    </td>
                    <td className="td-cell">
                      <span className="role-chip">
                        {member.role === "OWNER"
                          ? "Owner"
                          : member.role === "SUPER_ADMIN"
                            ? "Super admin"
                            : member.role === "AUDITOR"
                              ? "Auditor"
                              : "Admin"}
                      </span>
                    </td>
                    <td className="td-cell">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-medium ${member.active ? "text-[hsl(var(--status-valid-text))]" : "text-[hsl(var(--text-tertiary))]"}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${member.active ? "dot-valid" : "dot-neutral"}`}
                          aria-hidden
                        />
                        {member.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="td-cell">
                      <AdminStatusForm
                        adminId={member.id}
                        username={member.username ?? member.email.split("@")[0]}
                        role={member.role}
                        active={member.active}
                        disabled={member.id === admin.id}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add admin form */}
        <div className="work-surface overflow-hidden p-0 h-fit">
          <div className="px-6 py-5 border-b border-[hsl(var(--border-default))]">
            <p className="kicker mb-1">Add admin</p>
            <h2 className="section-title">Create internal access</h2>
            <p className="meta-text mt-1">
              Create a new operator or super admin account.
            </p>
          </div>
          <div className="px-6 py-6">
            <CreateAdminForm actorRole={admin.role} />
          </div>
        </div>
      </div>
    </div>
  );
}
