"use client";

import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const COLLEGES = [
  "College of Accountancy",
  "College of Agriculture",
  "College of Arts and Sciences",
  "College of Business Administration",
  "College of Informatics and Computing Studies",
  "College of Criminology",
  "College of Education",
  "College of Engineering and Architecture",
  "College of Law",
  "College of Medical Technology",
  "College of Medicine",
  "College of Midwifery",
  "College of Music",
  "College of Nursing",
  "College of Respiratory Therapy",
  "College of Communication",
  "School of International Relations",
  "School of Graduate Studies",
];

export default function OnboardingPage() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);

  const selectCollege = async (college: string) => {
    if (!profile) return;
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, "users", profile.uid), {
        college: college,
      });
      router.push("/user-dashboard");
    } catch (error) {
      console.error("Error updating college:", error);
      setIsUpdating(false);
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-[#F5F5F5] py-12 px-4 md:px-8">
      <div className="max-w-6xl mx-auto space-y-10">
        <header className="text-center space-y-3">
          <h1 className="text-4xl font-bold text-[#333333] font-headline">Select your College or School</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Tell us which academic unit you belong to so we can personalize your library experience.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {COLLEGES.map((college) => (
            <Button
              key={college}
              onClick={() => selectCollege(college)}
              disabled={isUpdating}
              className="h-20 bg-white border-2 border-[#0B3D73] text-[#0B3D73] text-lg font-medium shadow-sm hover:bg-[#F2C94C] hover:border-[#F2C94C] transition-all whitespace-normal text-center leading-tight rounded-xl py-2 px-4"
            >
              {college}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}