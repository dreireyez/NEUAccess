"use client";

import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Loader2, ExternalLink, ShieldAlert, RotateCcw } from "lucide-react";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { clearStuckAuthState } from "@/lib/auth-recovery";
import { useAuth as useFirebaseAuth } from "@/firebase";

export default function LoginPage() {
  const { signIn, loading, isPopupBlocked, setIsPopupBlocked, user } = useAuth();
  const auth = useFirebaseAuth();
  const [isRecovering, setIsRecovering] = useState(false);
  const [showRecoveryOption, setShowRecoveryOption] = useState(false);
  
  const logoImage = PlaceHolderImages.find(img => img.id === 'university-logo');
  const heroImage = PlaceHolderImages.find(img => img.id === 'login-hero');

  // Show recovery option if stuck loading for too long
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (loading) {
      timeout = setTimeout(() => {
        setShowRecoveryOption(true);
      }, 10000);
    } else {
      setShowRecoveryOption(false);
    }
    return () => clearTimeout(timeout);
  }, [loading]);

  const handleRecovery = async () => {
    setIsRecovering(true);
    try {
      await clearStuckAuthState(auth);
      // Reload page to restart auth
      window.location.href = '/';
    } catch (e) {
      console.error("Recovery failed:", e);
      setIsRecovering(false);
    }
  };

  return (
    <main className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-white">
      {/* Left Section: Hero Image */}
      <div className="relative flex-[1.2] hidden md:block h-full w-full bg-[#0B3D73]">
        {heroImage ? (
          <Image
            src={heroImage.imageUrl}
            alt={heroImage.description}
            fill
            className="object-cover"
            priority
            unoptimized
            data-ai-hint={heroImage.imageHint}
          />
        ) : (
          <div className="w-full h-full bg-slate-200 animate-pulse" />
        )}
        <div className="absolute inset-0 neu-gradient opacity-80 mix-blend-multiply" />
        <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-white text-center">
          <h1 className="text-6xl lg:text-8xl font-black mb-6 tracking-tighter font-headline drop-shadow-2xl">NEU ACCESS</h1>
          <p className="text-xl lg:text-2xl font-medium opacity-90 max-w-lg leading-relaxed">
            The Official Library Visitor Monitoring System of New Era University.
          </p>
        </div>
      </div>

      {/* Right Section: Login Panel */}
      <div className="flex-1 h-full bg-white flex flex-col items-center justify-center p-6 md:p-12 overflow-y-auto">
        <div className="w-full max-w-sm flex flex-col items-center justify-center space-y-12">
          {/* Logo Container */}
          <div className="relative w-full aspect-square max-w-[200px] md:max-w-[240px] flex items-center justify-center group overflow-hidden rounded-full mx-auto">
            <div className="absolute inset-0 bg-[#0B3D73]/5 rounded-full scale-110 group-hover:scale-125 transition-transform duration-500 blur-2xl" />
            {logoImage ? (
              <div className="relative w-40 h-40 md:w-56 md:h-56 flex items-center justify-center">
                <Image
                  src={logoImage.imageUrl}
                  alt={logoImage.description}
                  fill
                  className="object-contain transition-transform duration-500 hover:rotate-3"
                  unoptimized
                  data-ai-hint={logoImage.imageHint}
                />
              </div>
            ) : (
              <div className="w-32 h-32 bg-slate-100 rounded-full animate-pulse" />
            )}
          </div>
          
          <div className="space-y-4 text-center w-full">
            <h2 className="text-4xl font-black text-[#0B3D73] font-headline tracking-tight">Welcome Back!</h2>
            <p className="text-slate-500 font-medium text-balance">Sign in using your institutional account to continue.</p>
          </div>

          <div className="w-full space-y-6">
            <Button
              onClick={signIn}
              disabled={loading || isRecovering}
              className="w-full h-16 neu-button-gold text-lg font-bold flex items-center justify-center gap-4 rounded-3xl shadow-2xl hover:translate-y-[-2px] transition-all"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#0B3D73]" />
                  <span>Verifying Session...</span>
                </div>
              ) : isRecovering ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#0B3D73]" />
                  <span>Recovering...</span>
                </div>
              ) : (
                <>
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
                  <span>Sign in with Google</span>
                </>
              )}
            </Button>

            {showRecoveryOption && !loading && !isRecovering && (
              <Button
                onClick={handleRecovery}
                variant="outline"
                className="w-full h-12 border-2 border-amber-300 text-[#0B3D73] font-bold rounded-2xl hover:bg-amber-50 gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Stuck? Reset Sign-in
              </Button>
            )}

            <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-[0.2em] pt-4">
              University Library Rules & Regulations Apply
            </p>
          </div>
        </div>
      </div>

      {/* Popup Blocked Dialog */}
      <Dialog open={isPopupBlocked} onOpenChange={setIsPopupBlocked}>
        <DialogContent className="rounded-3xl border-none shadow-2xl p-8 max-w-sm mx-auto">
          <DialogHeader className="items-center text-center space-y-4">
            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center">
              <ShieldAlert className="w-10 h-10 text-[#D4AF37]" />
            </div>
            <DialogTitle className="text-2xl font-black text-[#0B3D73] font-headline">Sign-In Blocked</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium leading-relaxed">
              Your browser blocked the sign-in window. Please click the button below to open it manually.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex flex-col gap-3">
            <Button 
              onClick={signIn} 
              className="w-full h-14 neu-button-gold rounded-2xl font-black text-lg gap-3"
            >
              <ExternalLink className="w-5 h-5" />
              Open Window
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => setIsPopupBlocked(false)}
              className="w-full text-slate-400 font-bold"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
