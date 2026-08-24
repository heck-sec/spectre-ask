import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh flex-col bg-zinc-950 text-zinc-100">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-800 px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight text-violet-400">
            SPECTRE
          </span>
          <span className="rounded border border-zinc-700 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">
            Beta
          </span>
        </Link>
        {clerkEnabled ? (
          <UserButton />
        ) : (
          <span className="font-mono text-[10px] text-zinc-600">dev mode</span>
        )}
      </header>
      <main className="min-h-0 flex-1">{children}</main>
    </div>
  );
}
