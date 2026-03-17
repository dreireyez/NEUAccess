
"use client";

import { useAuth } from "@/context/AuthContext";
import { useFirestore } from "@/firebase";
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
  const db = useFirestore();
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedCollege, setSelectedCollege] = useState<string | null>(null);

  const selectCollege = async (college: string) => {
    if (!profile) return;
    setSelectedCollege(college);
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, "users", profile.id), {
        college: college,
      });
      router.push("/user-dashboard");
    } catch (error) {
      console.error("Error updating college:", error);
      setIsUpdating(false);
      setSelectedCollege(null);
    }
  };

  if (loading) return null;

  return (
    <main className="flex flex-col h-screen w-full overflow-hidden bg-white">
      {/* Header Section with Gradient */}
      <div className="w-full bg-gradient-to-r from-[#0B3D73] to-[#0B5C9E] py-10 md:py-14 px-6 md:px-12 text-center relative overflow-hidden">
        <div className="absolute inset-0 neu-gradient opacity-60 mix-blend-multiply" />
        <div className="relative z-10">
          <h1 className="text-5xl md:text-6xl font-black text-white font-headline tracking-tight mb-4 drop-shadow-lg">
            Complete Your Profile
          </h1>
          <p className="text-lg md:text-xl text-white/95 font-medium max-w-3xl mx-auto leading-relaxed">
            Select your academic unit to personalize your library experience and gain access to NEU Access.
          </p>
        </div>
      </div>

      {/* Content Section */}
      <div className="flex-1 overflow-y-auto py-12 md:py-16 px-6 md:px-12 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {COLLEGES.map((college) => (
              <Button
                key={college}
                onClick={() => selectCollege(college)}
                disabled={isUpdating || selectedCollege !== null}
                className={`h-28 neu-button-gold text-[#0B3D73] text-base md:text-lg font-bold shadow-xl hover:translate-y-[-3px] transition-all rounded-3xl whitespace-normal text-center leading-snug p-6 flex items-center justify-center ${
                  selectedCollege === college ? 'ring-4 ring-[#0B3D73] scale-105' : ''
                }`}
              >
                {selectedCollege === college && isUpdating ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin">
                      <svg className="w-5 h-5 text-[#0B3D73]" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    </div>
                    <span className="text-sm font-semibold">Updating...</span>
                  </div>
                ) : (
                  college
                )}
              </Button>
            ))}
          </div>

          <div className="mt-12 p-6 md:p-8 bg-gradient-to-r from-[#0B3D73]/5 to-[#D4AF37]/5 rounded-2xl border border-[#0B3D73]/10">
            <p className="text-center text-slate-600 font-medium">
              This information helps us track library usage across academic units and improve facility allocation.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
