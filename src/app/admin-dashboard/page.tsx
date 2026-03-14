
"use client";

import { useAuth } from "@/context/AuthContext";
import { useFirestore, useMemoFirebase, useCollection, useDoc } from "@/firebase";
import { 
  collection, 
  query, 
  orderBy, 
  doc, 
  updateDoc, 
  limit,
  setDoc,
  deleteDoc,
  where,
  getDocs,
  writeBatch
} from "firebase/firestore";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { 
  Users, 
  Search, 
  ShieldAlert, 
  Menu, 
  X, 
  LayoutDashboard,
  LogOut,
  UserCheck,
  Ban,
  ClipboardCheck,
  History,
  Trash2,
  Settings,
  Clock,
  MoreVertical,
  AlertTriangle,
  Copy
} from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export default function AdminDashboard() {
  const { profile, logout, loading, user } = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "visits">("overview");
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState({
    today: 0,
    week: 0,
    month: 0
  });

  const adminDocRef = useMemoFirebase(() => user ? doc(db, "roles_admin", user.uid) : null, [db, user]);
  const staffDocRef = useMemoFirebase(() => user ? doc(db, "roles_staff", user.uid) : null, [db, user]);
  
  const { data: adminDoc, isLoading: checkingAdmin } = useDoc(adminDocRef);
  const { data: staffDoc, isLoading: checkingStaff } = useDoc(staffDocRef);

  const isProvisioned = !!(adminDoc || staffDoc);
  const isProfileAdmin = profile?.role === 'admin' || profile?.role === 'staff';
  const isActuallyAuthorized = !loading && !checkingAdmin && !checkingStaff && isProfileAdmin && isProvisioned;

  const usersQuery = useMemoFirebase(() => {
    if (!isActuallyAuthorized) return null;
    return collection(db, "users");
  }, [db, isActuallyAuthorized]);
  
  const { data: usersList = [], isLoading: usersLoading } = useCollection(usersQuery);

  const visitsQuery = useMemoFirebase(() => {
    if (!isActuallyAuthorized) return null;
    return query(collection(db, "visits"), orderBy("timeIn", "desc"), limit(500));
  }, [db, isActuallyAuthorized]);
  
  const { data: visitsList = [], isLoading: visitsLoading } = useCollection(visitsQuery);

  useEffect(() => {
    if (!loading && !checkingAdmin && !checkingStaff && profile && profile.role === 'user') {
      router.push("/user-dashboard");
    }
  }, [loading, checkingAdmin, checkingStaff, profile, router]);

  useEffect(() => {
    if (!visitsList || visitsList.length === 0) return;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));

    const todayCount = (visitsList || []).filter((v: any) => v.timeIn?.toDate && v.timeIn.toDate() >= startOfDay).length;
    const weekCount = (visitsList || []).filter((v: any) => v.timeIn?.toDate && v.timeIn.toDate() >= startOfWeek).length;
    const monthCount = visitsList.length;

    setStats({
      today: todayCount,
      week: weekCount,
      month: monthCount
    });
  }, [visitsList]);

  const copyUid = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid);
      toast({ title: "UID Copied", description: "User ID copied to clipboard." });
    }
  };

  const deleteSingleVisit = async (visitId: string) => {
    if (!isActuallyAuthorized) return;
    try {
      await deleteDoc(doc(db, "visits", visitId));
      toast({ title: "Visit Deleted", description: "Record successfully removed." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete record.", variant: "destructive" });
    }
  };

  const wipeUserVisits = async (userId: string, displayName: string) => {
    if (profile?.role !== 'admin') return;
    setIsProcessing(true);
    try {
      const q = query(collection(db, "visits"), where("userId", "==", userId));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      toast({
        title: "Wipe Successful",
        description: `All visit history for ${displayName} has been cleared.`,
      });
    } catch (error) {
      console.error("Wipe error:", error);
      toast({ title: "Wipe Failed", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleBlockUser = async (userId: string, currentStatus: boolean) => {
    if (profile?.role !== 'admin') return;
    try {
      await updateDoc(doc(db, "users", userId), {
        isBlocked: !currentStatus
      });
      toast({
        title: !currentStatus ? "User Blocked" : "User Unblocked",
        description: `Successfully updated status.`,
      });
    } catch (error: any) {
      console.error("Error blocking user:", error);
    }
  };

  const updateUserRole = async (userId: string, newRole: "admin" | "staff" | "user") => {
    if (profile?.role !== 'admin') return;
    try {
      await updateDoc(doc(db, "users", userId), {
        role: newRole
      });

      const adminRef = doc(db, "roles_admin", userId);
      const staffRef = doc(db, "roles_staff", userId);

      await deleteDoc(adminRef);
      await deleteDoc(staffRef);

      if (newRole === "admin") {
        await setDoc(adminRef, { active: true });
      } else if (newRole === "staff") {
        await setDoc(staffRef, { active: true });
      }

      toast({
        title: "Role Updated",
        description: `User role changed to ${newRole}.`,
      });
    } catch (error: any) {
      console.error("Error updating user role:", error);
      toast({
        title: "Update Failed",
        variant: "destructive"
      });
    }
  };

  const filteredUsers = (usersList || []).filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading || checkingAdmin || checkingStaff) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#0B3D73] border-t-transparent rounded-full animate-spin" />
          <div className="text-[#0B3D73] font-bold">Verifying Administrator Access...</div>
        </div>
      </div>
    );
  }

  if (isProfileAdmin && !isProvisioned) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#F5F5F5] p-4">
        <Card className="max-w-xl w-full border-none shadow-2xl overflow-hidden rounded-3xl">
          <div className="h-2 neu-bg-blue w-full" />
          <CardHeader className="text-center pb-2">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-10 h-10 text-amber-600" />
            </div>
            <CardTitle className="text-3xl font-black font-headline text-[#0B3D73]">Provisioning Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-center text-muted-foreground font-medium">
              Your profile is marked as <span className="text-[#0B3D73] font-bold">{profile?.role}</span>, but your UID must be manually added to the segregation collection for full security clearance.
            </p>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4 shadow-inner">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5" />
                Firestore Access Steps
              </h3>
              <ol className="text-sm text-slate-600 space-y-4 list-decimal pl-4">
                <li>Create a collection in Firestore named: <code className="bg-slate-200 px-1.5 py-0.5 rounded text-[#0B3D73] font-mono">roles_admin</code></li>
                <li>Add a document where the <strong>Document ID</strong> is your UID:
                  <div className="mt-2 flex items-center gap-2 bg-white p-3 border rounded-xl shadow-sm">
                    <code className="flex-1 font-mono text-[11px] break-all text-[#0B3D73] font-bold">
                      {user?.uid}
                    </code>
                    <Button size="sm" variant="outline" onClick={copyUid} className="h-8 rounded-lg gap-2">
                      <Copy className="w-3 h-3" />
                      Copy
                    </Button>
                  </div>
                </li>
              </ol>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={() => window.location.reload()} className="flex-1 h-12 neu-button-gold rounded-xl font-bold shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all">
                I've Added It, Refresh
              </Button>
              <Button onClick={logout} variant="outline" className="flex-1 h-12 rounded-xl font-bold border-[#0B3D73] text-[#0B3D73]">Sign Out</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F5F5F5] overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 neu-bg-blue text-white transition-transform duration-300 transform md:relative md:translate-x-0 shadow-2xl",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-[#D4AF37] p-2 rounded-xl shadow-lg">
                <ShieldAlert className="w-6 h-6 text-[#0B3D73]" />
              </div>
              <div>
                <h1 className="text-xl font-black font-headline tracking-tighter">ADMIN PANEL</h1>
                <p className="text-[10px] opacity-60 font-black uppercase tracking-widest">NEU Library</p>
              </div>
            </div>
            <button className="md:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex-1 px-4 space-y-1">
            <button 
              onClick={() => setActiveTab("overview")}
              className={cn(
                "w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all",
                activeTab === "overview" ? "bg-white/10 text-white shadow-inner" : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              <LayoutDashboard className="w-5 h-5" />
              Dashboard
            </button>
            <button 
              onClick={() => setActiveTab("users")}
              className={cn(
                "w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all",
                activeTab === "users" ? "bg-white/10 text-white shadow-inner" : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              <Users className="w-5 h-5" />
              Members
            </button>
            <button 
              onClick={() => setActiveTab("visits")}
              className={cn(
                "w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all",
                activeTab === "visits" ? "bg-white/10 text-white shadow-inner" : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              <History className="w-5 h-5" />
              Visit Records
            </button>
          </nav>

          <div className="p-6 border-t border-white/10 space-y-4">
            <div className="flex items-center gap-3 px-2 bg-white/5 p-3 rounded-2xl">
              <div className="w-10 h-10 rounded-full bg-[#D4AF37] flex items-center justify-center font-black text-[#0B3D73]">
                {profile?.displayName?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black truncate uppercase tracking-tight">{profile?.displayName}</p>
                <p className="text-[10px] text-white/50 uppercase font-black">{profile?.role}</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={logout}
              className="w-full h-12 border-white/10 text-white hover:bg-white hover:text-[#0B3D73] rounded-xl font-bold"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-20 bg-white border-b flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <button className="md:hidden p-2 bg-slate-100 rounded-lg" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-6 h-6 text-[#0B3D73]" />
            </button>
            <h2 className="text-2xl font-black font-headline text-[#0B3D73] capitalize">{activeTab}</h2>
          </div>
          <div className="flex-1 max-w-md ml-8">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-[#0B3D73] transition-colors" />
              <Input 
                placeholder="Search..." 
                className="pl-12 h-12 bg-slate-50 border-none rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0B3D73]/10 transition-all font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {activeTab === "overview" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                  { label: "Today's Volume", val: stats.today, color: "neu-bg-blue", icon: Clock },
                  { label: "Weekly Total", val: stats.week, color: "bg-emerald-600", icon: LayoutDashboard },
                  { label: "Grand Total", val: stats.month, color: "bg-amber-600", icon: History },
                ].map((s, i) => (
                  <Card key={i} className="bg-white border-none shadow-xl rounded-3xl overflow-hidden group">
                    <div className={cn("h-2 w-full", s.color)} />
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</span>
                        <s.icon className="w-4 h-4 text-slate-300" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-4xl font-black text-[#0B3D73]">{s.val}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="rounded-3xl border-none shadow-xl">
                  <CardHeader className="flex flex-row items-center justify-between p-8 border-b border-slate-50">
                    <CardTitle className="text-lg font-black font-headline text-[#0B3D73]">Live Feed</CardTitle>
                    <History className="w-5 h-5 text-slate-300" />
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableBody>
                        {(visitsList || []).slice(0, 5).map((v: any) => (
                          <TableRow key={v.id} className="border-slate-50">
                            <TableCell className="pl-8 py-4">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-800">
                                  {v.timeIn?.toDate ? v.timeIn.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...'}
                                </span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase">{v.userId?.substring(0,8)}...</span>
                              </div>
                            </TableCell>
                            <TableCell>
                               <span className={cn("text-[10px] font-black px-2 py-1 rounded-full uppercase", v.status === 'active' ? "text-amber-600 bg-amber-50" : "text-green-600 bg-green-50")}>
                                 {v.status}
                               </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border-none shadow-xl">
                  <CardHeader className="flex flex-row items-center justify-between p-8 border-b border-slate-50">
                    <CardTitle className="text-lg font-black font-headline text-[#0B3D73]">Member Summary</CardTitle>
                    <Users className="w-5 h-5 text-slate-300" />
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="space-y-6">
                      {[
                        { label: "Active Users", count: usersList.filter(u => !u.isBlocked).length, color: "bg-emerald-500" },
                        { label: "Blocked Accounts", count: usersList.filter(u => u.isBlocked).length, color: "bg-rose-500" },
                        { label: "Staff Members", count: usersList.filter(u => u.role === 'staff').length, color: "bg-[#0B3D73]" },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn("w-3 h-3 rounded-full", item.color)} />
                            <span className="font-bold text-slate-600 text-sm">{item.label}</span>
                          </div>
                          <span className="font-black text-[#0B3D73]">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {activeTab === "users" && (
            <Card className="rounded-3xl border-none shadow-xl overflow-hidden">
               <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black text-[#0B3D73] font-headline">Directory</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Managing {filteredUsers.length} total members</p>
                  </div>
               </div>
               <div className="overflow-x-auto">
                 <Table>
                   <TableHeader className="bg-slate-50/50">
                     <TableRow className="border-none">
                       <TableHead className="pl-8 py-6 font-black text-[10px] uppercase text-slate-400">User Profile</TableHead>
                       <TableHead className="py-6 font-black text-[10px] uppercase text-slate-400">Department</TableHead>
                       <TableHead className="py-6 font-black text-[10px] uppercase text-slate-400">Access</TableHead>
                       <TableHead className="py-6 font-black text-[10px] uppercase text-slate-400">Status</TableHead>
                       <TableHead className="pr-8 py-6 text-right font-black text-[10px] uppercase text-slate-400">Actions</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {usersLoading ? (
                        <TableRow><TableCell colSpan={5} className="py-20 text-center text-slate-400 font-bold">Loading...</TableCell></TableRow>
                     ) : filteredUsers.map((u) => (
                       <TableRow key={u.id} className="border-slate-50">
                         <TableCell className="pl-8 py-6">
                           <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-[#0B3D73]">
                               {u.displayName?.charAt(0)}
                             </div>
                             <div>
                               <p className="font-black text-sm text-slate-800 leading-tight">{u.displayName}</p>
                               <p className="text-xs text-slate-400 font-medium">{u.email}</p>
                             </div>
                           </div>
                         </TableCell>
                         <TableCell className="text-xs font-bold text-slate-500">{u.college || 'Unassigned'}</TableCell>
                         <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className={cn(
                                  "h-8 px-3 rounded-lg text-[10px] font-black uppercase transition-all",
                                  u.role === 'admin' ? "bg-purple-100 text-purple-700" :
                                  u.role === 'staff' ? "bg-blue-100 text-blue-700" :
                                  "bg-slate-100 text-slate-500"
                                )}>
                                  {u.role}
                                </Button>
                              </DropdownMenuTrigger>
                              {profile?.role === 'admin' && (
                                <DropdownMenuContent className="rounded-2xl border-none shadow-2xl p-2 min-w-[160px]">
                                  <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-400 px-3">Assign Role</DropdownMenuLabel>
                                  <DropdownMenuItem className="rounded-xl font-bold py-3" onClick={() => updateUserRole(u.id, "user")}>Student</DropdownMenuItem>
                                  <DropdownMenuItem className="rounded-xl font-bold py-3" onClick={() => updateUserRole(u.id, "staff")}>Staff</DropdownMenuItem>
                                  <DropdownMenuItem className="rounded-xl font-bold py-3" onClick={() => updateUserRole(u.id, "admin")}>Admin</DropdownMenuItem>
                                </DropdownMenuContent>
                              )}
                            </DropdownMenu>
                         </TableCell>
                         <TableCell>
                            <Switch 
                             checked={!u.isBlocked} 
                             onCheckedChange={() => toggleBlockUser(u.id, u.isBlocked)}
                             disabled={profile?.role !== 'admin' || u.id === profile?.id}
                             className="data-[state=checked]:bg-emerald-500"
                           />
                         </TableCell>
                         <TableCell className="pr-8 text-right">
                           <DropdownMenu>
                             <DropdownMenuTrigger asChild>
                               <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
                                 <MoreVertical className="w-4 h-4" />
                               </Button>
                             </DropdownMenuTrigger>
                             <DropdownMenuContent align="end" className="rounded-2xl shadow-2xl p-2">
                               <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-400 px-3">Data Management</DropdownMenuLabel>
                               <AlertDialog>
                                 <AlertDialogTrigger asChild>
                                   <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-rose-600 rounded-xl font-bold py-3 flex items-center gap-2">
                                     <Trash2 className="w-4 h-4" />
                                     Wipe All Visits
                                   </DropdownMenuItem>
                                 </AlertDialogTrigger>
                                 <AlertDialogContent className="rounded-3xl">
                                   <AlertDialogHeader>
                                     <AlertDialogTitle className="font-headline font-black text-rose-600 flex items-center gap-2">
                                       <AlertTriangle className="w-6 h-6" />
                                       Confirm Data Wipe
                                     </AlertDialogTitle>
                                     <AlertDialogDescription>
                                       This will permanently delete all visit logs for <strong>{u.displayName}</strong>. This action cannot be undone.
                                     </AlertDialogDescription>
                                   </AlertDialogHeader>
                                   <AlertDialogFooter>
                                     <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                                     <AlertDialogAction 
                                       onClick={() => wipeUserVisits(u.id, u.displayName)}
                                       className="bg-rose-600 hover:bg-rose-700 rounded-xl"
                                     >
                                       Yes, Delete History
                                     </AlertDialogAction>
                                   </AlertDialogFooter>
                                 </AlertDialogContent>
                               </AlertDialog>
                             </DropdownMenuContent>
                           </DropdownMenu>
                         </TableCell>
                       </TableRow>
                     ))}
                   </TableBody>
                 </Table>
               </div>
            </Card>
          )}

          {activeTab === "visits" && (
            <Card className="rounded-3xl border-none shadow-xl overflow-hidden">
              <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <h3 className="text-xl font-black text-[#0B3D73] font-headline">Visit Master Log</h3>
                <p className="text-xs text-slate-400 font-bold uppercase">{visitsList.length} Records</p>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-none">
                      <TableHead className="pl-8 py-6 font-black text-[10px] uppercase text-slate-400">Timestamp</TableHead>
                      <TableHead className="py-6 font-black text-[10px] uppercase text-slate-400">User UID</TableHead>
                      <TableHead className="py-6 font-black text-[10px] uppercase text-slate-400">Purposes</TableHead>
                      <TableHead className="py-6 font-black text-[10px] uppercase text-slate-400">Status</TableHead>
                      <TableHead className="pr-8 py-6 text-right font-black text-[10px] uppercase text-slate-400">Delete</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visitsList.map((v: any) => (
                      <TableRow key={v.id} className="border-slate-50">
                        <TableCell className="pl-8 py-6">
                           <p className="text-sm font-bold text-slate-800">
                            {v.timeIn?.toDate ? v.timeIn.toDate().toLocaleString() : 'Legacy Data'}
                           </p>
                        </TableCell>
                        <TableCell className="font-mono text-[10px] text-slate-400">{v.userId}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {Array.isArray(v.reasons) ? v.reasons.map((r: string) => (
                              <span key={r} className="px-2 py-0.5 bg-blue-50 text-[9px] font-bold text-[#0B3D73] rounded-md border border-blue-100">{r}</span>
                            )) : (
                              <span className="px-2 py-0.5 bg-slate-100 text-[9px] font-bold text-slate-400 rounded-md">{v.reason || 'N/A'}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                           <span className={cn(
                             "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider",
                             v.status === 'active' ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                           )}>
                             {v.status}
                           </span>
                        </TableCell>
                        <TableCell className="pr-8 text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => deleteSingleVisit(v.id)}
                            className="text-rose-400 hover:text-rose-600 h-8 w-8"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
