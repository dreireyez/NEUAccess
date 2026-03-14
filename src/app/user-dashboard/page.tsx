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
  ChevronRight,
  ShieldCheck
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
import Link from "next/link";

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
    return query(collection(db, "visits"), where("userId", "==", profile.id));
  }, [db, profile]);

  const { data: visits } = useCollection(visitsQuery);
  const [stats, setStats] = useState({ totalVisits: 0, favoriteReason: "N/A" });

  useEffect(() => {
    const list = visits || [];
    if (list.length === 0) return;

    const counts: Record<string, number> = {};
    list.forEach((v: any) => {
      if (Array.isArray(v.reasons)) {
        v.reasons.forEach((r: string) => { counts[r] = (counts[r] || 0) + 1; });
      }
    });
    
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    setStats({
      totalVisits: list.filter((v: any) => v.status === 'completed').length,
      favoriteReason: sorted.length > 0 ? sorted[0][0] : "N/A"
    });
  }, [visits]);

  const toggleReason = (reasonId: string) => {
    setSelectedReasons(prev => prev.includes(reasonId) ? prev.filter(id => id !== reasonId) : [...prev, reasonId]);
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
    } catch (e) { console.error(e); } finally { setIsLogging(false); }
  };

  const handleTimeOut = async () => {
    if (!activeVisitId) return;
    setIsLogging(true);
    try {
      await updateDoc(doc(db, "visits", activeVisitId), {
        timeOut: serverTimestamp(),
        status: "completed"
      });
      setActiveVisitId(null);
      setSelectedReasons([]);
    } catch (e) { console.error(e); } finally { setIsLogging(false); }
  };

  if (showWelcome) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0B3D73] text-white animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-8 max-w-lg px-8">
          <div className="w-32 h-32 bg-[#D4AF37] rounded-full flex items-center justify-center mx-auto animate-bounce shadow-[0_0_50px_rgba(212,175,55,0.4)]">
            <CheckCircle2 className="w-20 h-20 text-[#0B3D73]" />
          </div>
          <div className="space-y-4">
            <h1 className="text-6xl font-black font-headline tracking-tighter">Time-In Success!</h1>
            <p className="text-2xl font-light opacity-90">Welcome back to the library. Have a productive session!</p>
          </div>
        </div>
      </div>
    );
  }

  const sortedVisits = [...(visits || [])].sort((a, b) => (b.timeIn?.toDate() || 0) - (a.timeIn?.toDate() || 0));
  const isAdminOrStaff = profile?.role === 'admin' || profile?.role === 'staff';

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <nav className="neu-bg-blue text-white p-4 sticky top-0 z-40 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-[#D4AF37]" />
            </div>
            <div>
              <h1 className="text-xl font-black font-headline leading-tight">NEU Access</h1>
              <p className="text-[10px] opacity-70 uppercase tracking-widest font-black">University Library Hub</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isAdminOrStaff && (
              <Link href="/admin-dashboard">
                <Button variant="ghost" className="text-white hover:bg-white/10 rounded-2xl hidden md:flex font-bold">
                  <ShieldCheck className="w-4 h-4 mr-2 text-[#D4AF37]" /> Admin Panel
                </Button>
              </Link>
            )}
            <div className="hidden lg:block text-right mr-4">
              <p className="text-sm font-black">{profile?.displayName}</p>
              <p className="text-[10px] opacity-70 font-bold">{profile?.college}</p>
            </div>
            <Button 
              onClick={logout} 
              className="bg-white text-[#0B3D73] hover:bg-rose-600 hover:text-white rounded-2xl px-6 font-bold h-10 transition-all border-none shadow-md flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" /> 
              <span>Sign Out</span>
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto w-full p-4 md:p-10 space-y-10 flex-1">
        {activeVisitId ? (
          <div className="bg-[#0B3D73] text-white p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-white/10 transition-colors" />
            <div className="flex items-center gap-6 relative z-10">
              <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20">
                <Clock className="w-8 h-8 text-[#D4AF37] animate-pulse" />
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-black font-headline">Library Session Active</p>
                <p className="text-white/60 font-medium">We're tracking your time for analytics. Enjoy your study!</p>
              </div>
            </div>
            <Button onClick={handleTimeOut} disabled={isLogging} className="w-full md:w-auto h-16 px-10 bg-[#D4AF37] hover:bg-[#F2C94C] text-[#0B3D73] rounded-3xl font-black text-lg relative z-10 shadow-lg active:scale-95 transition-all">
              {isLogging ? "Processing..." : "Finish & Time Out"}
            </Button>
          </div>
        ) : (
          <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="space-y-2 text-center md:text-left">
              <h2 className="text-4xl font-black text-[#0B3D73] font-headline tracking-tighter">New Visit</h2>
              <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Select your library purposes for today</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {REASONS.map((item) => (
                <button key={item.id} onClick={() => toggleReason(item.id)} className={cn(
                  "h-40 flex flex-col items-center justify-center gap-4 rounded-[2rem] border-4 transition-all duration-300 shadow-sm",
                  selectedReasons.includes(item.id) 
                    ? "bg-[#D4AF37] border-[#D4AF37] text-[#0B3D73] scale-95 shadow-xl rotate-1" 
                    : "bg-white border-transparent text-[#0B3D73] hover:border-[#0B3D73]/20 hover:shadow-lg"
                )}>
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center transition-colors",
                    selectedReasons.includes(item.id) ? "bg-white/20" : "bg-slate-50"
                  )}>
                    <item.icon className={cn("w-7 h-7", selectedReasons.includes(item.id) ? "text-[#0B3D73]" : "text-[#D4AF37]")} />
                  </div>
                  <span className="font-black text-sm tracking-tight">{item.label}</span>
                </button>
              ))}
            </div>
            <Button disabled={selectedReasons.length === 0 || isLogging} onClick={handleTimeIn} className="w-full h-20 neu-button-gold text-2xl font-black rounded-3xl shadow-2xl flex items-center justify-center gap-4 group">
              {isLogging ? "Processing..." : <>Confirm Time-In <ChevronRight className="w-8 h-8 group-hover:translate-x-2 transition-transform" /></>}
            </Button>
          </section>
        )}

        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden group hover:shadow-2xl transition-all">
            <div className="h-3 neu-bg-blue w-full" />
            <CardHeader className="flex flex-row items-center justify-between p-8 pb-4">
              <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Completed Visits</CardTitle>
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-[#0B3D73]" /></div>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <div className="text-6xl font-black text-[#0B3D73]">{stats.totalVisits}</div>
            </CardContent>
          </Card>
          <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden group hover:shadow-2xl transition-all">
            <div className="h-3 bg-[#D4AF37] w-full" />
            <CardHeader className="flex flex-row items-center justify-between p-8 pb-4">
              <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-widest">Top Interest</CardTitle>
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center"><Star className="w-5 h-5 text-[#D4AF37]" /></div>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <div className="text-4xl font-black text-[#0B3D73] truncate">{stats.favoriteReason}</div>
            </CardContent>
          </Card>
        </section>

        <section className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border-none">
          <div className="p-8 border-b bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#0B3D73] rounded-xl flex items-center justify-center"><ClipboardList className="w-5 h-5 text-white" /></div>
              <h3 className="text-xl font-black text-[#0B3D73]">Visit Log History</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="border-none">
                  <TableHead className="pl-8 font-black uppercase text-[10px] tracking-widest text-slate-400 h-14">Timestamp</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400 h-14">Selected Purposes</TableHead>
                  <TableHead className="pr-8 text-right font-black uppercase text-[10px] tracking-widest text-slate-400 h-14">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedVisits.length > 0 ? sortedVisits.map((visit) => (
                  <TableRow key={visit.id} className="hover:bg-slate-50/50 border-slate-100">
                    <TableCell className="pl-8 py-6">
                      <p className="text-sm font-black text-slate-800">{visit.timeIn?.toDate()?.toLocaleDateString()}</p>
                      <p className="text-[10px] text-slate-400 font-bold">{visit.timeIn?.toDate()?.toLocaleTimeString()}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {visit.reasons?.map((r: string) => (
                          <span key={r} className="px-3 py-1 rounded-xl bg-blue-50 text-[#0B3D73] text-[10px] font-black border border-blue-100/50">
                            {r}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="pr-8 text-right">
                      <span className={cn(
                        "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tight",
                        visit.status === 'active' ? "bg-amber-100 text-amber-700 shadow-sm" : "bg-green-100 text-green-700"
                      )}>
                        {visit.status}
                      </span>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-40 text-center text-slate-400 font-medium">No logs recorded yet.</TableCell>
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
