import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
        <p className="text-sm text-muted-foreground">Sign in to your A3 CMS workspace.</p>
      </div>
      <LoginForm />
      <p className="text-xs text-muted-foreground text-center">
        Demo: <code className="font-mono">admin@a3brands.com</code> · <code className="font-mono">password123</code>
      </p>
    </div>
  );
}
