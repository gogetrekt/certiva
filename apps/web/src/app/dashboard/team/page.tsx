import { redirect } from "next/navigation";

import { AdminStatusForm } from "../../../components/admin-status-form";
import { CreateAdminForm } from "../../../components/create-admin-form";
import {
  getCurrentAdmin,
  getSessionToken,
  getTeamAdmins,
} from "../../../lib/api";
import { formatDate } from "../../../lib/date-format";
import { getServerDictionary } from "../../../lib/i18n-server";

export default async function TeamPage() {
  const token = await getSessionToken();
  if (!token) return null;
  const t = await getServerDictionary();

  const [admin, team] = await Promise.all([
    getCurrentAdmin(token),
    getTeamAdmins(token),
  ]);
  if (admin.role !== "OWNER" && admin.role !== "SUPER_ADMIN") redirect("/dashboard");

  return (
    <div className="space-y-6">
      {/* ── Page header ──────────────────────────────── */}
      <div className="pb-5 border-b border-[hsl(var(--border-default))]">
        <p className="kicker mb-2">{t.dashboard.team.title}</p>
        <h1 className="page-title">{t.dashboard.team.title}</h1>
        <p className="body-text mt-2">
          {t.dashboard.team.description}
        </p>
      </div>

      {/* ── Split layout ─────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        {/* Team table */}
        <div className="work-surface overflow-hidden p-0">
          <div className="px-6 py-5 border-b border-[hsl(var(--border-default))]">
            <p className="kicker mb-1">{t.dashboard.team.currentTeam}</p>
            <h2 className="section-title">{t.dashboard.team.authorizedAccounts}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="th-cell">{t.common.account}</th>
                  <th className="th-cell">{t.common.role}</th>
                  <th className="th-cell">{t.common.status}</th>
                  <th className="th-cell">{t.common.actions}</th>
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
                        {t.dashboard.team.addedPrefix} {formatDate(member.createdAt)}
                      </p>
                    </td>
                    <td className="td-cell">
                      <span className="role-chip">
                        {member.role === "OWNER" || member.role === "SUPER_ADMIN"
                          ? t.roles.superAdmin
                          : member.role === "AUDITOR"
                            ? t.roles.auditorViewer
                            : t.roles.adminOperator}
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
                        {member.active ? t.common.active : t.common.inactive}
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
            <p className="kicker mb-1">{t.dashboard.team.addAdmin}</p>
            <h2 className="section-title">{t.dashboard.team.createInternalAccess}</h2>
            <p className="meta-text mt-1">
              {t.dashboard.team.createDescription}
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
