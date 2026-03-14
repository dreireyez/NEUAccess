"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  signInWithPopup, 
  signOut, 
  User as FirebaseUser,
  GoogleAuthProvider
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
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
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useFirebaseAuth();
  const db = useFirestore();
  const { user: firebaseUser, isUserLoading } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const logout = async () => {
    await signOut(auth);
    setProfile(null);
    router.push("/");
  };

  const signIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
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
    } catch (error: any) {
      console.error("Sign in error", error);
      toast({
        title: "Sign-in Failed",
        description: error.message || "An error occurred during sign-in.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    async function checkProfile() {
      if (firebaseUser) {
        if (!firebaseUser.email?.endsWith("@neu.edu.ph")) {
          await logout();
          return;
        }

        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        let userProfile: UserProfile;

        if (!userSnap.exists()) {
          // STRICT: Initial role is ALWAYS "user".
          // Admin must manually move documents to roles_admin/roles_staff to upgrade.
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
            // This might happen if they were already in roles collections but didn't have a profile
          }
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

        setProfile(userProfile);

        // Routing Logic
        if (userProfile.college === null) {
          if (pathname !== "/onboarding") {
            router.push("/onboarding");
          }
        } else if (userProfile.role === "user") {
          if (pathname === "/" || pathname === "/onboarding" || pathname === "/admin-dashboard") {
            router.push("/user-dashboard");
          }
        } else if (userProfile.role === "admin" || userProfile.role === "staff") {
          if (pathname === "/" || pathname === "/onboarding" || pathname === "/user-dashboard") {
            router.push("/admin-dashboard");
          }
        }
      } else {
        setProfile(null);
        if (pathname !== "/" && !isUserLoading) {
          router.push("/");
        }
      }
      setIsProfileLoading(false);
    }

    if (!isUserLoading) {
      checkProfile();
    }
  }, [firebaseUser, isUserLoading, pathname, db, auth]);

  return (
    <AuthContext.Provider value={{ 
      user: firebaseUser, 
      profile, 
      loading: isUserLoading || isProfileLoading, 
      signIn, 
      logout 
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