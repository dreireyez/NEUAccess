
"use client";

import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export default function LoginPage() {
  const { signIn, loading } = useAuth();
  
  const logoImage = PlaceHolderImages.find(img => img.id === 'university-logo');
  const heroImage = PlaceHolderImages.find(img => img.id === 'login-hero');

  return (
    <main className="flex flex-col md:flex-row h-screen w-full overflow-hidden">
      {/* Left/Top Section: Hero Image with Brand Overlay */}
      <div className="relative flex-1 h-[40vh] md:h-full w-full">
        {heroImage && (
          <Image
            src={heroImage.imageUrl}
            alt={heroImage.description}
            fill
            className="object-cover"
            priority
            data-ai-hint={heroImage.imageHint}
          />
        )}
        <div className="absolute inset-0 neu-gradient opacity-80 mix-blend-multiply" />
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-white text-center">
          <h1 className="text-5xl md:text-7xl font-black mb-4 tracking-tighter font-headline">NEU ACCESS</h1>
          <p className="text-lg md:text-xl font-medium opacity-90 max-w-md">
            The Official Library Visitor Monitoring System of New Era University.
          </p>
        </div>
      </div>

      {/* Right/Bottom Section: Login Panel */}
      <div className="flex-1 h-[60vh] md:h-full bg-white flex flex-col items-center justify-center p-8 md:p-16">
        <div className="w-full max-w-sm flex flex-col space-y-10">
          <div className="space-y-6 text-center md:text-left">
            <div className="flex justify-center md:justify-start">
              {/* University Logo Placeholder */}
              <div className="relative w-28 h-28 mb-4">
                {logoImage && (
                  <Image
                    src={logoImage.imageUrl}
                    alt={logoImage.description}
                    fill
                    className="object-contain"
                    data-ai-hint={logoImage.imageHint}
                  />
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-4xl font-black text-[#0B3D73] font-headline tracking-tight">Welcome Back</h2>
              <p className="text-slate-500 font-medium">Sign in using your institutional account to continue.</p>
            </div>
          </div>

          <Button
            onClick={signIn}
            disabled={loading}
            className="w-full h-14 neu-button-gold text-lg font-bold flex items-center justify-center gap-3 rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
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

          <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest mt-8">
            University Library Rules & Regulations Apply
          </p>
        </div>
      </div>
    </main>
  );
}
