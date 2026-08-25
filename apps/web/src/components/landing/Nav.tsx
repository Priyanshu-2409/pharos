import Link from "next/link";
import { Wordmark } from "./Wordmark";

export function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-20 border-b border-line/40 bg-ink/70 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2.5 text-chalk">
          <Wordmark />
        </Link>
        <div className="hidden items-center gap-8 text-sm text-fog md:flex">
          <a href="#problem" className="transition-colors hover:text-chalk">Why</a>
          <a href="#features" className="transition-colors hover:text-chalk">Features</a>
          <a href="#how" className="transition-colors hover:text-chalk">How it works</a>
          <a href="#pricing" className="transition-colors hover:text-chalk">Pricing</a>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-md px-3 py-2 text-sm text-fog transition-colors hover:text-chalk"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-chalk px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:bg-white"
          >
            Start monitoring
          </Link>
        </div>
      </nav>
    </header>
  );
}