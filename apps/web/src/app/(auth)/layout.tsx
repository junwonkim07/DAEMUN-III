/**
 * Auth screens (sign in / sign up / onboarding) render without the site
 * navbar and footer — each page brings its own minimal chrome.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-1 flex-col bg-white text-ink">{children}</div>;
}
