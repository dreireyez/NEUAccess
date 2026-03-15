
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
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
      provider.setCustomParameters({ 
        prompt: 'select_account',
        hd: 'neu.edu.ph' // Hint for Google to show only institutional accounts
      });
      
      const ua = navigator.userAgent;
      const isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isAndroid = /Android/i.test(ua);
      
      if (isIOS) {
        // Popups are better for iOS to survive ITP
        await signInWithPopup(auth, provider);
      } else if (isAndroid) {
        // Redirects are more reliable for Android
        await signInWithRedirect(auth, provider);
      } else {
        // Desktop
        await signInWithPopup(auth, provider);
      }
    } catch (error: any) {
      if (error.code === 'auth/popup-blocked') {
        setIsPopupBlocked(true);
        return;
      }
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-closure-interaction') {
        return;
      }
      
      console.error("Sign in error", error);
      toast({
        title: "Sign-in Failed",
        description: error.message || "An error occurred during sign-in.",
        variant: "destructive",
      });
    }
  };

  // 1. Initialize Auth and Handle Redirect Results
  useEffect(() => {
    let isMounted = true;
    async function initAuth() {
      try {
        await setPersistence(auth, browserLocalPersistence);
        const result = await getRedirectResult(auth);
        
        if (result?.user && isMounted) {
          if (!result.user.email?.endsWith("@neu.edu.ph")) {
            await signOut(auth);
            toast({
              title: "Access Denied",
              description: "Please use your institutional @neu.edu.ph email.",
              variant: "destructive",
            });
          }
        }
      } catch (e: any) {
        if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/popup-blocked') {
          console.error("Auth init error:", e);
        }
      } finally {
        if (isMounted) setIsInitializing(false);
      }
    }
    initAuth();
    return () => { isMounted = false; };
  }, [auth, toast]);

  // 2. Synchronize Profile and Session State
  useEffect(() => {
    if (isInitializing || isUserLoading) return;
    
    let isMounted = true;

    async function syncProfile(user: FirebaseUser) {
      if (!user.email?.endsWith("@neu.edu.ph")) {
        await signOut(auth);
        return;
      }

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        let userProfile: UserProfile;

        if (!userSnap.exists()) {
          userProfile = {
            id: user.uid,
            email: user.email!,
            role: "user", // MANDATORY: All new users are students
            college: null,
            isBlocked: false,
            displayName: user.displayName || "Student",
            photoURL: user.photoURL || "",
          };
          await setDoc(userRef, {
            ...userProfile,
            createdAt: serverTimestamp(),
          });
        } else {
          userProfile = userSnap.data() as UserProfile;
        }

        if (userProfile.isBlocked) {
          await signOut(auth);
          toast({ title: "Access Denied", description: "Account blocked.", variant: "destructive" });
          return;
        }

        if (isMounted) {
          setProfile(userProfile);
          
          // Check for active visit session
          const visitsQuery = query(
            collection(db, "visits"), 
            where("userId", "==", user.uid), 
            where("status", "==", "active"), 
            limit(1)
          );
          const visitSnap = await getDocs(visitsQuery);
          if (!visitSnap.empty) {
            setActiveVisitId(visitSnap.docs[0].id);
          } else {
            setActiveVisitId(null);
          }

          // Smart Routing Logic
          if (userProfile.college === null) {
            if (pathname !== "/onboarding") router.push("/onboarding");
          } else if (userProfile.role === "admin" || userProfile.role === "staff") {
            // If on login page, push to admin. If elsewhere (like user dashboard), stay there.
            if (pathname === "/") router.push("/admin-dashboard");
          } else {
            // Regular user
            if (pathname === "/" || pathname === "/onboarding") router.push("/user-dashboard");
          }
        }
      } catch (e) {
        console.error("Profile sync error", e);
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
      if (pathname !== "/") {
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
