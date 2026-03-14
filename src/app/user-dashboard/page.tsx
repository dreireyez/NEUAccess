"use client";

import { useAuth } from "@/context/AuthContext";
import { useFirestore, useMemoFirebase, useCollection } from "@/firebase";
import { collection, addDoc, serverTimestamp, query, where, orderBy } from "firebase/firestore";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, BookOpen, Clock, Star } from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

const REASONS = [
  "Reading", 
  "Research", 
  "Use of Computer", 
  "Studying", 
  "Reviewing", 
  "Consultation", 
  "Printing", 
  "Discussion Room"
];

export default function UserDashboard() {
  const { profile, logout } = useAuth();
  const db = useFirestore();
  const [showWelcome, setShowWelcome] = useState(false);
  
  const visitsQuery = useMemoFirebase(() => {
    if (!profile) return null;
    // Simplified query for regular users to prevent permission/index errors
    return query(
      collection(db, "visits"),
      where("userId", "==", profile.id)
    );
  }, [db, profile]);

  const { data: visits = [] } = useCollection(visitsQuery);

  const [stats, setStats] = useState({ totalVisits: 0, favoriteReason: "N/A" });

  useEffect(() => {
    if (!visits) return;

    // Simple Stats Logic
    const counts: Record<string, number> = {};
    visits.forEach((v: any) => {
      counts[v.reason] = (counts[v.reason] || 0) + 1;
    });
    
    // Sort logic handled in memory for safety
    const sortedVisits = [...visits].sort((a, b) => {
       const dateA = a.timestamp?.toDate() || 0;
       const dateB = b.timestamp?.toDate() || 0;
       return dateB - dateA;
    });

    const topReason = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];

    setStats({
      totalVisits: visits.length,
      favoriteReason: topReason ? topReason[0] : "N/A"
    });
  }, [visits]);

  const logVisit = async (reason: string) => {
    if (!profile) return;
    
    try {
      await addDoc(collection(db, "visits"), {
        userId: profile.id,
        timestamp: serverTimestamp(),
        reason: reason,
      });

      setShowWelcome(true);
      setTimeout(() => setShowWelcome(false), 3000);
    } catch (error) {
      console.error("Error logging visit:", error);
    }
  };

  if (showWelcome) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B3D73] text-white animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-4">
          <BookOpen className="w-24 h-24 mx-auto animate-bounce text-[#D4AF37]" />
          <h1 className="text-6xl font-bold font-headline">Welcome to NEU Library!</h1>
          <p className="text-2xl font-light opacity-80">Have a productive session today.</p>
        </div>
      </div>
    );
  }

  // Sort visits for the table
  const sortedVisitsForTable = [...(visits || [])].sort((a, b) => {
     const dateA = a.timestamp?.toDate() || 0;
     const dateB = b.timestamp?.toDate() || 0;
     return dateB - dateA;
  });

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* Navbar */}
      <nav className="neu-bg-blue text-white p-4 sticky top-0 z-30 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#D4AF37] p-2 rounded-lg">
              <BookOpen className="w-6 h-6 text-[#0B3D73]" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-headline leading-tight">NEU Access</h1>
              <p className="text-xs opacity-70 hidden sm:block">Library Visitor App</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium">{profile?.displayName}</p>
              <p className="text-xs opacity-70">{profile?.college}</p>
            </div>
            <Button 
              variant="ghost" 
              onClick={logout}
              className="text-white hover:bg-white/10"
            >
              <LogOut className="w-5 h-5 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
        {/* Section 1: Log Visit */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-[#333333] font-headline">What's your purpose today?</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {REASONS.map((reason) => (
              <Button
                key={reason}
                onClick={() => logVisit(reason)}
                className="h-28 bg-white text-[#0B3D73] border-2 border-[#0B3D73] hover:bg-[#D4AF37] hover:border-[#D4AF37] hover:text-white transition-all rounded-2xl flex flex-col items-center justify-center gap-2 shadow-sm font-semibold"
              >
                <span className="text-center leading-tight">{reason}</span>
              </Button>
            ))}
          </div>
        </section>

        {/* Section 2: Stats Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-white border-none shadow-md overflow-hidden">
            <div className="h-2 neu-bg-blue w-full" />
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Library Visits</CardTitle>
              <Clock className="w-5 h-5 text-[#D4AF37]" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-[#0B3D73] font-headline">{stats.totalVisits}</div>
              <p className="text-xs text-muted-foreground mt-1">Visits recorded since your first log</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-md overflow-hidden">
            <div className="h-2 neu-bg-blue w-full" />
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Top Activity</CardTitle>
              <Star className="w-5 h-5 text-[#D4AF37]" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-[#0B3D73] font-headline">{stats.favoriteReason}</div>
              <p className="text-xs text-muted-foreground mt-1">Your most frequent reason for visiting</p>
            </CardContent>
          </Card>
        </section>

        {/* Section 3: History Table */}
        <section className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-xl font-bold font-headline">Recent Visit History</h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-semibold text-[#0B3D73]">Date & Time</TableHead>
                  <TableHead className="font-semibold text-[#0B3D73]">Purpose</TableHead>
                  <TableHead className="font-semibold text-[#0B3D73]">Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedVisitsForTable.length > 0 ? (
                  sortedVisitsForTable.map((visit) => (
                    <TableRow key={visit.id} className="hover:bg-gray-50/50">
                      <TableCell className="font-medium">
                        {visit.timestamp?.toDate() ? new Date(visit.timestamp.toDate()).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'Just now'}
                      </TableCell>
                      <TableCell>
                        <span className="px-3 py-1 rounded-full bg-blue-50 text-[#0B3D73] text-xs font-semibold">
                          {visit.reason}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">Main Library</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-12 text-muted-foreground">
                      No visits logged yet. Start by selecting your activity above!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </main>
    </div>
  );
}
