
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
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0B3D73] text-white animate-in fade-in duration-500">
        <div className="text-center space-y-6 max-w-lg px-6">
          <div className="w-24 h-24 bg-[#D4AF37] rounded-full flex items-center justify-center mx-auto animate-bounce shadow-2xl">
            <CheckCircle2 className="w-16 h-16 text-[#0B3D73]" />
          </div>
          <h1 className="text-5xl font-bold font-headline">Time-In Success!</h1>
          <p className="text-xl font-light opacity-90">Have a productive library session!</p>
        </div>
      </div>
    );
  }

  const sortedVisits = [...(visits || [])].sort((a, b) => (b.timeIn?.toDate() || 0) - (a.timeIn?.toDate() || 0));

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <nav className="neu-bg-blue text-white p-4 sticky top-0 z-30 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-[#D4AF37]" />
            <div>
              <h1 className="text-xl font-bold font-headline leading-tight">NEU Access</h1>
              <p className="text-[10px] opacity-70 uppercase tracking-widest font-bold">University Library</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:block text-right">
              <p className="text-sm font-semibold">{profile?.displayName}</p>
              <p className="text-xs opacity-70">{profile?.college}</p>
            </div>
            <Button variant="ghost" onClick={logout} className="text-white hover:bg-white/10 rounded-full"><LogOut className="w-5 h-5 mr-2" /> Sign Out</Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto w-full p-4 md:p-8 space-y-8 flex-1">
        {activeVisitId ? (
          <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center"><Clock className="w-6 h-6 text-amber-600 animate-pulse" /></div>
              <div><p className="font-bold text-amber-900">Active Visit Session</p><p className="text-sm text-amber-700">Recording your time in the library...</p></div>
            </div>
            <Button onClick={handleTimeOut} disabled={isLogging} className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white rounded-xl h-12 px-8 font-bold">{isLogging ? "Processing..." : "Time Out & End Visit"}</Button>
          </div>
        ) : (
          <section className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-3xl font-extrabold text-[#333333] font-headline">Time In</h2>
              <p className="text-muted-foreground font-medium">Select your purposes for visiting today.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {REASONS.map((item) => (
                <button key={item.id} onClick={() => toggleReason(item.id)} className={cn(
                  "h-32 flex flex-col items-center justify-center gap-3 rounded-2xl border-2 transition-all shadow-sm",
                  selectedReasons.includes(item.id) ? "bg-[#D4AF37] border-[#D4AF37] text-white scale-95" : "bg-white border-slate-200 text-[#0B3D73] hover:border-[#0B3D73]"
                )}>
                  <item.icon className={cn("w-8 h-8", selectedReasons.includes(item.id) ? "text-white" : "text-[#D4AF37]")} />
                  <span className="font-bold text-xs">{item.label}</span>
                </button>
              ))}
            </div>
            <Button disabled={selectedReasons.length === 0 || isLogging} onClick={handleTimeIn} className="w-full h-14 neu-button-gold text-lg font-bold rounded-2xl shadow-lg flex items-center justify-center gap-3">
              {isLogging ? "Logging..." : <>Confirm Time-In <ChevronRight className="w-6 h-6" /></>}
            </Button>
          </section>
        )}

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-white border-none shadow-xl rounded-3xl overflow-hidden">
            <div className="h-2 neu-bg-blue w-full" />
            <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Visits</CardTitle><CheckCircle2 className="w-5 h-5 text-[#D4AF37]" /></CardHeader>
            <CardContent><div className="text-5xl font-black text-[#0B3D73]">{stats.totalVisits}</div></CardContent>
          </Card>
          <Card className="bg-white border-none shadow-xl rounded-3xl overflow-hidden">
            <div className="h-2 bg-[#D4AF37] w-full" />
            <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-xs font-black text-slate-400 uppercase tracking-widest">Primary Interest</CardTitle><Star className="w-5 h-5 text-[#D4AF37]" /></CardHeader>
            <CardContent><div className="text-4xl font-black text-[#0B3D73] truncate">{stats.favoriteReason}</div></CardContent>
          </Card>
        </section>

        <section className="bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="p-8 border-b bg-slate-50/50 flex items-center gap-3"><ClipboardList className="w-6 h-6 text-[#0B3D73]" /><h3 className="text-xl font-black text-[#0B3D73]">Visit Log History</h3></div>
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow><TableHead className="pl-8 font-bold uppercase text-[10px] tracking-widest">Time In / Out</TableHead><TableHead className="font-bold uppercase text-[10px] tracking-widest">Selected Purposes</TableHead><TableHead className="pr-8 text-right font-bold uppercase text-[10px] tracking-widest">Status</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {sortedVisits.map((visit) => (
                <TableRow key={visit.id}>
                  <TableCell className="pl-8 py-4"><span className="text-sm font-bold text-slate-800">{visit.timeIn?.toDate()?.toLocaleString()}</span></TableCell>
                  <TableCell><div className="flex flex-wrap gap-1">{visit.reasons?.map((r: string) => (<span key={r} className="px-2 py-1 rounded-lg bg-blue-50 text-[#0B3D73] text-[9px] font-bold border border-blue-100">{r}</span>))}</div></TableCell>
                  <TableCell className="pr-8 text-right"><span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase", visit.status === 'active' ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700")}>{visit.status}</span></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      </main>
    </div>
  );
}
