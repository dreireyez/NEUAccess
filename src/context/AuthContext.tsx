"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  User as FirebaseUser 
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase";
import { useRouter, usePathname } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

interface UserProfile {
  uid: string;
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
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const logout = async () => {
    await signOut(auth);
    setProfile(null);
    setUser(null);
    router.push("/");
  };

  const signIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
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
    } catch (error) {
      console.error("Sign in error", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        if (!firebaseUser.email?.endsWith("@neu.edu.ph")) {
          await logout();
          return;
        }

        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        let userProfile: UserProfile;

        if (!userSnap.exists()) {
          userProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            role: "user",
            college: null,
            isBlocked: false,
            displayName: firebaseUser.displayName || "Student",
            photoURL: firebaseUser.photoURL || "",
          };
          await setDoc(userRef, {
            ...userProfile,
            createdAt: serverTimestamp(),
          });
        } else {
          userProfile = userSnap.data() as UserProfile;
        }

        if (userProfile.isBlocked) {
          await logout();
          toast({
            title: "Access Denied",
            description: "Please contact the library administrator.",
            variant: "destructive",
          });
          return;
        }

        setUser(firebaseUser);
        setProfile(userProfile);

        // Routing Logic
        if (userProfile.college === null) {
          router.push("/onboarding");
        } else if (userProfile.role === "user") {
          if (pathname === "/" || pathname === "/onboarding") {
            router.push("/user-dashboard");
          }
        } else if (userProfile.role === "admin" || userProfile.role === "staff") {
          if (pathname === "/" || pathname === "/onboarding") {
            router.push("/admin-dashboard");
          }
        }
      } else {
        setUser(null);
        setProfile(null);
        if (pathname !== "/") {
          router.push("/");
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [pathname]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};