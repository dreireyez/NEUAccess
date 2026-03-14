
"use client";

import { useAuth } from "@/context/AuthContext";
import { useFirestore, useMemoFirebase, useCollection } from "@/firebase";
import { collection, addDoc, serverTimestamp, query, where, doc, updateDoc } from "firebase/firestore";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  LogOut, 
  BookOpen, 
  Clock, 
  Star, 
  Book, 
  Search, 
  Monitor, 
  Pencil, 
  ClipboardList, 
  Users, 
  Printer, 
  MessagesSquare,
  CheckCircle2,
  ChevronRight
} from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const REASONS = [
  { id: "Reading", label: "Reading", icon: Book },
  { id: "Research", label: "Research", icon: Search },
  { id: "Use of Computer", label: "PC Use", icon: Monitor },
  { id: "Studying", label: "Studying", icon: Pencil },
  { id: "Reviewing", label: "Reviewing", icon: ClipboardList },
  { id: "Consultation", label: "Consultation", icon: Users },
  { id: "Printing", label: "Printing", icon: Printer },
  { id: "Discussion Room", label: "Discussion", icon: MessagesSquare },
];

export default function UserDashboard() {
  const { profile, logout, activeVisitId, setActiveVisitId } = useAuth();
  const db = useFirestore();
  const [showWelcome, setShowWelcome] = useState(false);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [isLogging, setIsLogging] = useState(false);
  
  const visitsQuery = useMemoFirebase(() => {
    if (!profile) return null;
    return query(
      collection(db, "visits"),
      where("userId", "==", profile.id)
    );
  }, [db, profile]);

  const { data: visits = [] } = useCollection(visitsQuery);

  const [stats, setStats] = useState({ totalVisits: 0, favoriteReason: "N/A" });

  useEffect(() => {
    if (!visits || visits.length === 0) {
      setStats({ totalVisits: 0, favoriteReason: "N/A" });
      return;
    }

    const counts: Record<string, number> = {};
    (visits || []).forEach((v: any) => {
      if (Array.isArray(v.reasons)) {
        v.reasons.forEach((r: string) => {
          counts[r] = (counts[r] || 0) + 1;
        });
      } else if (v.reason) {
        counts[v.reason] = (counts[v.reason] || 0) + 1;
      }
    });
    
    const sortedReasons = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const topReason = sortedReasons.length > 0 ? sortedReasons[0][0] : "N/A";

    setStats({
      totalVisits: (visits || []).filter((v: any) => v.status === 'completed').length,
      favoriteReason: topReason
    });
  }, [visits]);

  const toggleReason = (reasonId: string) => {
    setSelectedReasons(prev => 
      prev.includes(reasonId) 
        ? prev.filter(id => id !== reasonId) 
        : [...prev, reasonId]
    );
  };

  const handleTimeIn = async () => {
    if (!profile || selectedReasons.length === 0) return;
    setIsLogging(true);
    
    try {
      const docRef = await addDoc(collection(db, "visits"), {
        userId: profile.id,
        timeIn: serverTimestamp(),
        timeOut: null,
        reasons: selectedReasons,
        status: "active",
      });

      setActiveVisitId(docRef.id);
      setShowWelcome(true);
      setTimeout(() => setShowWelcome(false), 3000);
    } catch (error) {
      console.error("Error logging visit:", error);
    } finally {
      setIsLogging(false);
    }
  };

  const handleTimeOut = async () => {
    if (!activeVisitId) return;
    setIsLogging(true);
    try {
      const visitRef = doc(db, "visits", activeVisitId);
      await updateDoc(visitRef, {
        timeOut: serverTimestamp(),
        status: "completed"
      });
      setActiveVisitId(null);
      setSelectedReasons([]);
    } catch (error) {
      console.error("Error timing out:", error);
    } finally {
      setIsLogging(false);
    }
  };

  if (showWelcome) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0B3D73] text-white transition-opacity duration-500 animate-in fade-in">
        <div className="text-center space-y-6 max-w-lg px-6">
          <div className="w-24 h-24 bg-[#D4AF37] rounded-full flex items-center justify-center mx-auto animate-bounce shadow-2xl">
            <CheckCircle2 className="w-16 h-16 text-[#0B3D73]" />
          </div>
          <div className="space-y-2 animate-in slide-in-from-bottom-4 duration-700">
            <h1 className="text-5xl font-bold font-headline">Time-In Success!</h1>
            <p className="text-xl font-light opacity-90">Your library visit has been recorded. Have a productive session!</p>
          </div>
        </div>
      </div>
    );
  }

  const sortedVisitsForTable = [...(visits || [])].sort((a, b) => {
     const dateA = a.timeIn?.toDate ? a.timeIn.toDate() : 0;
     const dateB = b.timeIn?.toDate ? b.timeIn.toDate() : 0;
     return dateB - dateA;
  });

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      {/* Navbar */}
      <nav className="neu-bg-blue text-white p-4 sticky top-0 z-30 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#D4AF37] p-2 rounded-lg shadow-inner">
              <BookOpen className="w-6 h-6 text-[#0B3D73]" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-headline leading-tight">NEU Access</h1>
              <p className="text-[10px] opacity-70 uppercase tracking-widest hidden sm:block font-bold">University Library</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:block text-right">
              <p className="text-sm font-semibold">{profile?.displayName}</p>
              <p className="text-xs opacity-70 font-medium">{profile?.college}</p>
            </div>
            <Button 
              variant="ghost" 
              onClick={logout}
              className="text-white hover:bg-white/10 rounded-full"
            >
              <LogOut className="w-5 h-5 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto w-full p-4 md:p-8 space-y-8 flex-1">
        {/* Active Visit Banner */}
        {activeVisitId && (
          <div className="bg-amber-50 border-2 border-amber-200 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600 animate-pulse" />
              </div>
              <div>
                <p className="font-bold text-amber-900">Active Visit Session</p>
                <p className="text-sm text-amber-700">Recording your time in the library...</p>
              </div>
            </div>
            <Button 
              onClick={handleTimeOut} 
              disabled={isLogging}
              className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white rounded-xl h-12 px-8 font-bold"
            >
              {isLogging ? "Processing..." : "Time Out & Sign Out"}
            </Button>
          </div>
        )}

        {!activeVisitId && (
          <section className="space-y-6 animate-in fade-in duration-500">
            <div className="space-y-1">
              <h2 className="text-3xl font-extrabold text-[#333333] font-headline tracking-tight">Time In</h2>
              <p className="text-muted-foreground font-medium">Select your purposes for visiting the library today.</p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {REASONS.map((item) => {
                const isSelected = selectedReasons.includes(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleReason(item.id)}
                    className={cn(
                      "h-32 flex flex-col items-center justify-center gap-3 rounded-2xl border-2 transition-all duration-200 shadow-sm relative overflow-hidden group",
                      isSelected 
                        ? "bg-[#D4AF37] border-[#D4AF37] text-white scale-95" 
                        : "bg-white border-slate-200 text-[#0B3D73] hover:border-[#0B3D73] hover:bg-slate-50"
                    )}
                  >
                    <item.icon className={cn("w-8 h-8 transition-transform group-hover:scale-110", isSelected ? "text-white" : "text-[#D4AF37]")} />
                    <span className="font-bold text-sm text-center leading-tight px-2">{item.label}</span>
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-white rounded-full p-0.5">
                        <CheckCircle2 className="w-4 h-4 text-[#0B3D73]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <Button 
              disabled={selectedReasons.length === 0 || isLogging}
              onClick={handleTimeIn}
              className="w-full h-14 neu-button-gold text-lg font-bold rounded-2xl shadow-lg flex items-center justify-center gap-3 hover:scale-[1.01] active:scale-[0.98] transition-all"
            >
              {isLogging ? "Logging..." : (
                <>
                  Confirm Time-In 
                  <ChevronRight className="w-6 h-6" />
                </>
              )}
            </Button>
          </section>
        )}

        {/* Stats Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-white border-none shadow-xl rounded-2xl overflow-hidden group">
            <div className="h-2 neu-bg-blue w-full group-hover:h-3 transition-all" />
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Total Library Visits</CardTitle>
              <CheckCircle2 className="w-5 h-5 text-[#D4AF37]" />
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-black text-[#0B3D73] font-headline">{stats.totalVisits}</div>
              <p className="text-xs text-muted-foreground mt-2 font-medium">Completed sessions</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-xl rounded-2xl overflow-hidden group">
            <div className="h-2 bg-[#D4AF37] w-full group-hover:h-3 transition-all" />
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Primary Interest</CardTitle>
              <Star className="w-5 h-5 text-[#D4AF37]" fill="currentColor" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-[#0B3D73] font-headline truncate">{stats.favoriteReason}</div>
              <p className="text-xs text-muted-foreground mt-2 font-medium">Most common visit reason</p>
            </CardContent>
          </Card>
        </section>

        {/* History Table */}
        <section className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
          <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <ClipboardList className="w-6 h-6 text-[#0B3D73]" />
              <h3 className="text-xl font-black font-headline text-[#0B3D73]">Visit Log History</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="font-bold text-[#0B3D73] py-4 pl-8 uppercase text-[10px] tracking-widest">Time In / Out</TableHead>
                  <TableHead className="font-bold text-[#0B3D73] py-4 uppercase text-[10px] tracking-widest">Selected Purposes</TableHead>
                  <TableHead className="font-bold text-[#0B3D73] py-4 pr-8 uppercase text-[10px] tracking-widest text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedVisitsForTable.length > 0 ? (
                  sortedVisitsForTable.map((visit) => (
                    <TableRow key={visit.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                      <TableCell className="py-6 pl-8">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-800">
                            {visit.timeIn?.toDate ? new Date(visit.timeIn.toDate()).toLocaleString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric'
                            }) : 'Legacy Log'}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            {visit.timeIn?.toDate ? new Date(visit.timeIn.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'} 
                            {visit.timeOut?.toDate ? ` - ${new Date(visit.timeOut.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : visit.status === 'active' ? ' (Ongoing)' : ''}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-6">
                        <div className="flex flex-wrap gap-1.5">
                          {Array.isArray(visit.reasons) ? visit.reasons.map((r: string) => (
                            <span key={r} className="px-2.5 py-1 rounded-lg bg-blue-50 text-[#0B3D73] text-[10px] font-bold border border-blue-100">
                              {r}
                            </span>
                          )) : (
                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-400 text-[10px] font-bold">
                              {visit.reason || 'N/A'}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-6 pr-8 text-right">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                          visit.status === 'active' ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                        )}>
                          {visit.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-20">
                      <div className="flex flex-col items-center gap-4 text-slate-400">
                        <Clock className="w-12 h-12 opacity-20" />
                        <p className="font-bold">No library visits logged yet.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </main>

      <footer className="p-8 text-center border-t border-slate-100 bg-white">
        <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.2em]">New Era University Library • © 2024</p>
      </footer>
    </div>
  );
}
