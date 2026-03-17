
"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut, 
  User as FirebaseUser,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs, updateDoc, limit } from "firebase/firestore";
import { useAuth as useFirebaseAuth, useFirestore, useUser } from "@/firebase";
import { useRouter, usePathname } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { hasLoadingTimedOut, recoverFromStuckLogin, clearStuckAuthState } from "@/lib/auth-recovery";

interface UserProfile {
  id: string;
  email: string;
  role: "admin" | "staff" | "user";
  college: string | null;
  isBlocked: boolean;
  displayName: string;
  photoURL: string;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isPopupBlocked: boolean;
  setIsPopupBlocked: (blocked: boolean) => void;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
  activeVisitId: string | null;
  setActiveVisitId: (id: string | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useFirebaseAuth();
  const db = useFirestore();
  const { user: firebaseUser, isUserLoading } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeVisitId, setActiveVisitId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isPopupBlocked, setIsPopupBlocked] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  
  // Track initialization time to detect stuck states
  const initStartTimeRef = useRef<number>(0);
  const authCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const logout = async () => {
    if (activeVisitId) {
      try {
        const visitRef = doc(db, "visits", activeVisitId);
        await updateDoc(visitRef, {
          timeOut: serverTimestamp(),
          status: "completed"
        });
      } catch (e) {
        console.error("Error timing out visit during logout:", e);
      }
    }
    
    await signOut(auth);
    setProfile(null);
    setActiveVisitId(null);
    router.push("/");
  };

  const signIn = async () => {
    setIsPopupBlocked(false);
    try {
      // Ensure persistence is set BEFORE signing in
      await setPersistence(auth, browserLocalPersistence);
      
      const provider = new GoogleAuthProvider();
      // Configure provider for institutional accounts
      provider.setCustomParameters({ 
        prompt: 'select_account',
        hd: 'neu.edu.ph' // Restrict to institutional domain
      });
      
      // Add hosted domain restriction at the provider level for better enforcement
      provider.addScope('email');
      provider.addScope('profile');
      
      const ua = navigator.userAgent;
      const isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isAndroid = /Android/i.test(ua);
      
      if (isIOS) {
        // Popups are better for iOS to survive ITP
        const result = await signInWithPopup(auth, provider);
        if (result?.user) {
          console.log("Popup sign-in successful on iOS:", result.user.email);
        }
      } else if (isAndroid) {
        // Redirects are more reliable for Android - handles all redirect scenarios
        console.log("Using redirect sign-in for Android");
        await signInWithRedirect(auth, provider);
        // Note: Page will reload after redirect, so code after this won't execute
      } else {
        // Desktop - prefer popup for better UX
        const result = await signInWithPopup(auth, provider);
        if (result?.user) {
          console.log("Popup sign-in successful on desktop:", result.user.email);
        }
      }
    } catch (error: any) {
      if (error.code === 'auth/popup-blocked') {
        console.warn("Popup was blocked");
        setIsPopupBlocked(true);
        return;
      }
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-closure-interaction') {
        console.log("User closed sign-in popup");
        return;
      }
      if (error.code === 'auth/unauthorized-domain') {
        toast({
          title: "Configuration Error",
          description: "This application is not authorized for your domain.",
          variant: "destructive",
        });
        return;
      }
      
      console.error("Sign in error", error);
      toast({
        title: "Sign-in Failed",
        description: error.message || "An error occurred during sign-in. Please try again.",
        variant: "destructive",
      });
    }
  };

  // 1. Initialize Auth and Handle Redirect Results
  useEffect(() => {
    let isMounted = true;
    initStartTimeRef.current = Date.now();
    
    async function initAuth() {
      try {
        // Ensure persistence is set early
        await setPersistence(auth, browserLocalPersistence);
        
        // Handle redirect result from Google Sign-in on mobile devices
        const result = await getRedirectResult(auth);
        
        if (result?.user && isMounted) {
          // Validate email domain
          const userEmail = result.user.email;
          if (!userEmail?.endsWith("@neu.edu.ph")) {
            console.log("Invalid email domain:", userEmail);
            await signOut(auth);
            toast({
              title: "Access Denied",
              description: "Please use your institutional @neu.edu.ph email.",
              variant: "destructive",
            });
            return;
          }
          
          // Set profile immediately so component knows user is authed
          // This prevents redirect loops
          console.log("Redirect result user authenticated:", result.user.email);
        }
      } catch (e: any) {
        if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/popup-blocked') {
          console.error("Auth init error:", e);
          if (isMounted) {
            toast({
              title: "Authentication Error",
              description: "Failed to initialize authentication. Please refresh the page.",
              variant: "destructive",
            });
          }
        }
      } finally {
        // Always mark as not initializing after attempt
        if (isMounted) setIsInitializing(false);
      }
    }
    
    initAuth();
    
    // Set a timeout to detect stuck authentication states
    // If loading takes more than 15 seconds, something is wrong
    authCheckTimeoutRef.current = setTimeout(() => {
      if (isMounted && isUserLoading && isInitializing) {
        console.warn("Authentication check timeout - possible stuck state detected");
        
        // Try to recover by clearing stuck auth state
        if (auth) {
          clearStuckAuthState(auth).catch(e => console.error("Recovery failed:", e));
        }
      }
    }, 15000);
    
    return () => { 
      isMounted = false;
      if (authCheckTimeoutRef.current) {
        clearTimeout(authCheckTimeoutRef.current);
      }
    };
  }, [auth, toast, isUserLoading, isInitializing]);

  // 2. Synchronize Profile and Session State
  useEffect(() => {
    if (isInitializing || isUserLoading) return;
    
    let isMounted = true;

    async function syncProfile(user: FirebaseUser) {
      const userEmail = user.email;
      
      // Domain validation - strict enforcement
      if (!userEmail || !userEmail.endsWith("@neu.edu.ph")) {
        console.log("Domain validation failed for email:", userEmail);
        try {
          await signOut(auth);
        } catch (e) {
          console.error("Error signing out invalid domain user:", e);
        }
        if (isMounted) {
          toast({ 
            title: "Access Denied", 
            description: "Only institutional @neu.edu.ph emails are allowed.", 
            variant: "destructive" 
          });
          router.push("/");
        }
        return;
      }

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        let userProfile: UserProfile;

        if (!userSnap.exists()) {
          // New user - create profile
          userProfile = {
            id: user.uid,
            email: userEmail,
            role: "user", // All new users start as regular users
            college: null,
            isBlocked: false,
            displayName: user.displayName || "Student",
            photoURL: user.photoURL || "",
          };
          
          if (isMounted) {
            await setDoc(userRef, {
              ...userProfile,
              createdAt: serverTimestamp(),
            });
          }
        } else {
          userProfile = userSnap.data() as UserProfile;
        }

        // Check if user is blocked
        if (userProfile.isBlocked) {
          try {
            await signOut(auth);
          } catch (e) {
            console.error("Error signing out blocked user:", e);
          }
          if (isMounted) {
            toast({ 
              title: "Access Denied", 
              description: "Your account has been blocked. Contact support.", 
              variant: "destructive" 
            });
            router.push("/");
          }
          return;
        }

        if (isMounted) {
          setProfile(userProfile);
          
          // Check for active visit session
          try {
            const visitsQuery = query(
              collection(db, "visits"), 
              where("userId", "==", user.uid), 
              where("status", "==", "active"), 
              limit(1)
            );
            const visitSnap = await getDocs(visitsQuery);
            if (isMounted) {
              setActiveVisitId(visitSnap.empty ? null : visitSnap.docs[0].id);
            }
          } catch (e) {
            console.error("Error fetching active visits:", e);
          }

          // Smart routing logic - only redirect when necessary
          if (userProfile.college === null && pathname !== "/onboarding" && pathname !== "/") {
            console.log("Redirecting to onboarding - college not set");
            router.push("/onboarding");
          } else if ((userProfile.role === "admin" || userProfile.role === "staff") && pathname === "/") {
            console.log("Redirecting admin/staff to dashboard");
            router.push("/admin-dashboard");
          } else if (userProfile.role === "user" && (pathname === "/" || pathname === "/onboarding") && userProfile.college !== null) {
            console.log("Redirecting user to user-dashboard");
            router.push("/user-dashboard");
          }
        }
      } catch (e) {
        console.error("Profile sync error:", e);
        if (isMounted) {
          toast({ 
            title: "Connection Error", 
            description: "Failed to sync your profile. Please try again.", 
            variant: "destructive" 
          });
        }
      }
    }

    if (firebaseUser) {
      syncProfile(firebaseUser);
    } else {
      setProfile(null);
      setActiveVisitId(null);
      // Only redirect to home if not already there
      if (pathname !== "/" && !isInitializing) {
        router.push("/");
      }
    }

    return () => { isMounted = false; };
  }, [firebaseUser, isUserLoading, isInitializing, pathname, db, auth, router, toast]);

  return (
    <AuthContext.Provider value={{ 
      user: firebaseUser, 
      profile, 
      loading: isUserLoading || isInitializing || (firebaseUser && !profile), 
      isPopupBlocked,
      setIsPopupBlocked,
      signIn, 
      logout,
      activeVisitId,
      setActiveVisitId
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
