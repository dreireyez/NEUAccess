
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
      
      await setPersistence(auth, browserLocalPersistence);
      
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      if (isMobile) {
        // Redirect is necessary for mobile to handle third-party cookie restrictions
        await signInWithRedirect(auth, provider);
      } else {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        if (!user.email?.endsWith("@neu.edu.ph")) {
          await signOut(auth);
          toast({
            title: "Access Denied",
            description: "Please use your institutional @neu.edu.ph email.",
            variant: "destructive",
          });
          return;
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

  // Handle Auth State and Redirect Results
  useEffect(() => {
    let isMounted = true;

    async function checkAuthAndProfile() {
      // 1. Check for Redirect Result (Mobile)
      try {
        const redirectResult = await getRedirectResult(auth);
        if (redirectResult?.user && isMounted) {
          if (!redirectResult.user.email?.endsWith("@neu.edu.ph")) {
            await signOut(auth);
            toast({
              title: "Access Denied",
              description: "Institutional email required.",
              variant: "destructive",
            });
            return;
          }
        }
      } catch (e) {
        console.error("Redirect error", e);
      }

      // 2. Process Firebase User
      if (firebaseUser) {
        if (!firebaseUser.email?.endsWith("@neu.edu.ph")) {
          await logout();
          return;
        }

        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        let userProfile: UserProfile;

        if (!userSnap.exists()) {
          // STRICTLY assign 'user' role to new sign-ups
          userProfile = {
            id: firebaseUser.uid,
            email: firebaseUser.email!,
            role: "user", 
            college: null,
            isBlocked: false,
            displayName: firebaseUser.displayName || "Student",
            photoURL: firebaseUser.photoURL || "",
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
          await logout();
          toast({
            title: "Access Denied",
            description: "Account blocked. Contact admin.",
            variant: "destructive",
          });
          return;
        }

        if (isMounted) {
          setProfile(userProfile);

          // Active visit check
          const visitsQuery = query(
            collection(db, "visits"),
            where("userId", "==", firebaseUser.uid),
            where("status", "==", "active"),
            limit(1)
          );
          const visitSnap = await getDocs(visitsQuery);
          if (!visitSnap.empty) {
            setActiveVisitId(visitSnap.docs[0].id);
          }

          // Navigation Logic
          if (userProfile.college === null) {
            if (pathname !== "/onboarding") router.push("/onboarding");
          } else if (userProfile.role === "admin" || userProfile.role === "staff") {
            if (pathname === "/" || pathname === "/onboarding") router.push("/admin-dashboard");
          } else {
            if (pathname === "/" || pathname === "/onboarding" || pathname === "/admin-dashboard") router.push("/user-dashboard");
          }
        }
      } else {
        if (isMounted) {
          setProfile(null);
          setActiveVisitId(null);
          if (pathname !== "/" && !isUserLoading) {
            router.push("/");
          }
        }
      }

      if (isMounted) setIsProfileLoading(false);
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
