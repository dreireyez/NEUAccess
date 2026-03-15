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
  browserLocalPersistence
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
        setActiveVisitId(null);
      } catch (e) {
        console.error("Error timing out visit during logout:", e);
      }
    }
    
    await signOut(auth);
    setProfile(null);
    router.push("/");
  };

  const signIn = async () => {
    setIsPopupBlocked(false);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      await setPersistence(auth, browserLocalPersistence);
      
      const ua = navigator.userAgent;
      const isIOS = /iPhone|iPad|iPod/i.test(ua);
      const isAndroid = /Android/i.test(ua);
      
      // Hybrid: Popup for iOS, Redirect for Android
      if (isIOS) {
        const result = await signInWithPopup(auth, provider);
        handlePostSignIn(result.user);
      } else if (isAndroid) {
        await signInWithRedirect(auth, provider);
      } else {
        // Desktop
        const result = await signInWithPopup(auth, provider);
        handlePostSignIn(result.user);
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

  const handlePostSignIn = async (user: FirebaseUser | null) => {
    if (user && !user.email?.endsWith("@neu.edu.ph")) {
      await signOut(auth);
      toast({
        title: "Access Denied",
        description: "Please use your institutional @neu.edu.ph email.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function handleRedirect() {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user && isMounted) {
          handlePostSignIn(result.user);
        }
      } catch (e: any) {
        if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/popup-blocked') {
          console.error("Redirect handler error:", e);
        }
      } finally {
        if (isMounted) setIsInitializing(false);
      }
    }
    handleRedirect();
    return () => { isMounted = false; };
  }, [auth]);

  useEffect(() => {
    if (isInitializing || isUserLoading) return;
    let isMounted = true;

    async function syncProfile(user: FirebaseUser) {
      if (!user.email?.endsWith("@neu.edu.ph")) {
        await signOut(auth);
        return;
      }

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      let userProfile: UserProfile;

      if (!userSnap.exists()) {
        userProfile = {
          id: user.uid,
          email: user.email!,
          role: "user", // STRICTOR: Default is always student
          college: null,
          isBlocked: false,
          displayName: user.displayName || "Student",
          photoURL: user.photoURL || "",
        };
        try {
          await setDoc(userRef, {
            ...userProfile,
            createdAt: serverTimestamp(),
          });
        } catch (e) { console.error("Profile creation failed", e); }
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
        const visitsQuery = query(collection(db, "visits"), where("userId", "==", user.uid), where("status", "==", "active"), limit(1));
        const visitSnap = await getDocs(visitsQuery);
        if (!visitSnap.empty) setActiveVisitId(visitSnap.docs[0].id);

        if (userProfile.college === null) {
          if (pathname !== "/onboarding") router.push("/onboarding");
        } else if (userProfile.role === "admin" || userProfile.role === "staff") {
          if (pathname === "/" || pathname === "/onboarding") router.push("/admin-dashboard");
        } else {
          if (pathname === "/" || pathname === "/onboarding") router.push("/user-dashboard");
        }
      }
    }

    if (firebaseUser) syncProfile(firebaseUser);
    else {
      setProfile(null);
      setActiveVisitId(null);
      if (pathname !== "/") router.push("/");
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
