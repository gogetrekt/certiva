import { redirect } from "next/navigation";

import { DashboardShell } from "../../components/dashboard-shell";
import { ApiError, getCurrentAdmin, getSessionToken } from "../../lib/api";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const token = await getSessionToken();
  if (!token) {
    redirect("/login");
  }

  try {
    const admin = await getCurrentAdmin(token);
    return <DashboardShell admin={admin}>{children}</DashboardShell>;
  } catch (error) {
    // 401/403 means the token is stale or the admin was deleted.
    // We must clear the cookie before redirecting -- otherwise the middleware
    // sees a token, lets the user into /dashboard, and the layout throws again,
    // creating an infinite 307 loop. /api/session/clear deletes the cookie and
    // issues a final redirect to /login in a single response.
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      redirect("/api/session/clear");
    }
    // Any other error (network, 5xx) -- redirect to login without clearing the
    // cookie so the user can retry once the API recovers.
    redirect("/login");
  }
}
