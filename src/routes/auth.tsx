import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Mail, Lock, User as UserIcon, Loader2, LogIn, UserPlus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: (s.redirect as string) || "/",
  }),
  head: () => ({
    meta: [
      { title: "Sign in — StudyMart" },
      { name: "description", content: "Sign in or create an account." },
    ],
  }),
  beforeLoad: async ({ search, context }) => {
    // Quick check via storage to avoid flash; real check happens in component
    void context;
    void search;
  },
  component: AuthPage,
});

function AuthPage() {
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { redirect: redirectTo } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) {
    navigate({ to: redirectTo as "/" });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } =
        mode === "signin"
          ? await signIn(email, password)
          : await signUp(email, password, name);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success(mode === "signin" ? "Welcome back!" : "Account created!");
        navigate({ to: redirectTo as "/" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <header className="flex items-center gap-3 px-5 pb-3 pt-4">
        <Link to="/" className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
          <ArrowLeft className="h-[18px] w-[18px]" />
        </Link>
      </header>

      <div className="px-6 pt-4">
        <h1 className="text-3xl font-bold tracking-tight">
          {mode === "signin" ? "Welcome back" : "Create account"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "signin"
            ? "Sign in to access your library."
            : "Join to buy and access digital products."}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-3">
          {mode === "signup" && (
            <div className="flex h-12 items-center gap-3 rounded-2xl bg-secondary px-4">
              <UserIcon className="h-[18px] w-[18px] text-muted-foreground" />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          )}
          <div className="flex h-12 items-center gap-3 rounded-2xl bg-secondary px-4">
            <Mail className="h-[18px] w-[18px] text-muted-foreground" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              autoComplete="email"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex h-12 items-center gap-3 rounded-2xl bg-secondary px-4">
            <Lock className="h-[18px] w-[18px] text-muted-foreground" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-all active:opacity-90 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Please wait…
              </>
            ) : mode === "signin" ? (
              <>
                <LogIn className="h-4 w-4" /> Sign in
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" /> Create account
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="font-semibold text-brand"
          >
            {mode === "signin" ? "Create one" : "Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
