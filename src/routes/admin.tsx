import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useIsAdmin } from "@/lib/use-role";
import { AdminShell } from "@/components/admin-shell";
import { useAuth } from "@/lib/auth";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  component: AdminGuard,
});

function AdminGuard() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading } = useIsAdmin();

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <h1 className="text-2xl font-bold">Sign in required</h1>
        <p className="text-sm text-muted-foreground">The admin panel is private.</p>
        <Link
          to="/auth"
          search={{ redirect: "/admin" }}
          className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-2xl">
          🔒
        </div>
        <h1 className="text-2xl font-bold">Not authorized</h1>
        <p className="max-w-xs text-sm text-muted-foreground">
          This area is reserved for the site owner.
        </p>
        <Link
          to="/"
          className="rounded-full bg-secondary px-6 py-3 text-sm font-semibold"
        >
          Back to site
        </Link>
      </div>
    );
  }

  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}
