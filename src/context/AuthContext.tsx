
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
  const [isProfileLoading, setIsProfileLoading] = useState(true);
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
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      // Ensure persistence is set before sign-in
      await setPersistence(auth, browserLocalPersistence);
      
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      if (isMobile) {
        // Explicitly use redirect for mobile to avoid popup blockers and cross-site tracking issues
        await signInWithRedirect(auth, provider);
      } else {
        const result = await signInWithPopup(auth, provider);
        if (result.user && !result.user.email?.endsWith("@neu.edu.ph")) {
          await signOut(auth);
          toast({
            title: "Access Denied",
            description: "Please use your institutional @neu.edu.ph email.",
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
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

  // Main Auth and Profile Synchronizer
  useEffect(() => {
    let isMounted = true;

    async function processUser(user: FirebaseUser) {
      if (!user.email?.endsWith("@neu.edu.ph")) {
        await signOut(auth);
        return;
      }

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      let userProfile: UserProfile;

      if (!userSnap.exists()) {
        // STRICT ENFORCEMENT: New users are ALWAYS students/users
        userProfile = {
          id: user.uid,
          email: user.email!,
          role: "user", 
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
        } catch (e) {
          console.error("Failed to create profile", e);
        }
      } else {
        userProfile = userSnap.data() as UserProfile;
      }

      if (userProfile.isBlocked) {
        await signOut(auth);
        toast({
          title: "Access Denied",
          description: "Account blocked. Contact admin.",
          variant: "destructive",
        });
        return;
      }

      if (isMounted) {
        setProfile(userProfile);

        // Check for active library visits
        const visitsQuery = query(
          collection(db, "visits"),
          where("userId", "==", user.uid),
          where("status", "==", "active"),
          limit(1)
        );
        const visitSnap = await getDocs(visitsQuery);
        if (!visitSnap.empty) {
          setActiveVisitId(visitSnap.docs[0].id);
        }

        // Navigation Routing Logic
        if (userProfile.college === null) {
          if (pathname !== "/onboarding") router.push("/onboarding");
        } else if (userProfile.role === "admin" || userProfile.role === "staff") {
          // Allow admins/staff to visit the user-dashboard if they want, 
          // but direct them to admin panel if they are at the root or onboarding
          if (pathname === "/" || pathname === "/onboarding") router.push("/admin-dashboard");
        } else {
          // Standard users are restricted to onboarding and dashboard
          if (pathname === "/" || pathname === "/onboarding") router.push("/user-dashboard");
        }
      }
    }

    async function checkAuthAndProfile() {
      try {
        // 1. Handle Redirect Result FIRST (crucial for mobile recovery)
        const redirectResult = await getRedirectResult(auth);
        if (redirectResult?.user) {
          await processUser(redirectResult.user);
          if (isMounted) setIsProfileLoading(false);
          return;
        }

        // 2. Fallback to current user state if no redirect result
        if (firebaseUser) {
          await processUser(firebaseUser);
        } else {
          if (isMounted) {
            setProfile(null);
            setActiveVisitId(null);
            // Protect private routes
            const publicRoutes = ["/"];
            if (!publicRoutes.includes(pathname) && !isUserLoading) {
              router.push("/");
            }
          }
        }
      } catch (e: any) {
        console.error("Auth initialization error:", e);
      } finally {
        if (isMounted) setIsProfileLoading(false);
      }
    }

    if (!isUserLoading) {
      checkAuthAndProfile();
    }

    return () => { isMounted = false; };
  }, [firebaseUser, isUserLoading, pathname, db, auth, router, toast]);

  return (
    <AuthContext.Provider value={{ 
      user: firebaseUser, 
      profile, 
      loading: isUserLoading || isProfileLoading, 
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
