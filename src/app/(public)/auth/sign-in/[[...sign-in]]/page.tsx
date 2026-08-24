import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-zinc-950 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-violet-400">SPECTRE</h1>
        <p className="mt-1 text-sm text-zinc-500">Ask · Beta</p>
      </div>
      <SignIn routing="path" path="/auth/sign-in" forceRedirectUrl="/" />
    </div>
  );
}
