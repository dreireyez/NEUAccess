"use client";

import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function LoginPage() {
  const { signIn, loading } = useAuth();

  return (
    <main className="flex flex-col md:flex-row h-screen w-full overflow-hidden">
      {/* Left/Top Section: Image with Overlay */}
      <div className="relative flex-1 h-[40vh] md:h-full w-full">
        <Image
          src="https://picsum.photos/seed/neu-lib/1200/800"
          alt="NEU University Building"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 neu-gradient opacity-80 mix-blend-multiply" />
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-white text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight font-headline">NEU ACCESS</h1>
          <p className="text-lg md:text-xl font-light max-w-md">
            The Official Library Visitor Monitoring System of New Era University.
          </p>
        </div>
      </div>

      {/* Right/Bottom Section: Login Panel */}
      <div className="flex-1 h-[60vh] md:h-full bg-white flex flex-col items-center justify-center p-8 md:p-16">
        <div className="w-full max-w-sm flex flex-col space-y-8">
          <div className="space-y-2 text-center md:text-left">
            <h2 className="text-3xl font-bold text-foreground font-headline">Welcome Back</h2>
            <p className="text-muted-foreground">Sign in using your university account to continue.</p>
          </div>

          <Button
            onClick={signIn}
            disabled={loading}
            className="w-full h-14 neu-button-gold text-lg font-semibold flex items-center justify-center gap-3 rounded-lg shadow-md hover:scale-[1.02] active:scale-95 transition-all"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </Button>

          <p className="text-xs text-center text-muted-foreground mt-8">
            By signing in, you agree to follow the University Library Rules and Regulations.
          </p>
        </div>
      </div>
    </main>
  );
}