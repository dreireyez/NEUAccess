
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
  where
} from "firebase/firestore";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { 
  Users, 
  Search, 
  ShieldAlert, 
  Menu, 
  LayoutDashboard,
  LogOut,
  History,
  Trash2,
  Clock,
  MoreVertical,
  Filter,
  TrendingUp,
  BookOpen,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

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

const REASONS = [
  "Reading", "Research", "Use of Computer", "Studying", "Reviewing", 
  "Consultation", "Printing", "Discussion Room"
];

export default function AdminDashboard() {
  const { profile, logout, loading, user } = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "visits">("overview");
  
  // Filters
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [collegeFilter, setCollegeFilter] = useState<string>("all");
  const [purposeFilter, setPurposeFilter] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<string>("daily");

  const [stats, setStats] = useState({ today: 0, week: 0, month: 0 });

  const adminDocRef = useMemoFirebase(() => user ? doc(db, "roles_admin", user.uid) : null, [db, user]);
  const staffDocRef = useMemoFirebase(() => user ? doc(db, "roles_staff", user.uid) : null, [db, user]);
  
  const { data: adminDoc, isLoading: checkingAdmin } = useDoc(adminDocRef);
  const { data: staffDoc, isLoading: checkingStaff } = useDoc(staffDocRef);

  const isProvisioned = !!(adminDoc || staffDoc);
  const isActuallyAuthorized = !loading && !checkingAdmin && !checkingStaff && (profile?.role === 'admin' || profile?.role === 'staff') && isProvisioned;

  const usersQuery = useMemoFirebase(() => isActuallyAuthorized ? collection(db, "users") : null, [db, isActuallyAuthorized]);
  const { data: usersList } = useCollection(usersQuery);

  const visitsQuery = useMemoFirebase(() => isActuallyAuthorized ? query(collection(db, "visits"), orderBy("timeIn", "desc"), limit(1000)) : null, [db, isActuallyAuthorized]);
  const { data: visitsList } = useCollection(visitsQuery);

  useEffect(() => {
    if (!loading && !checkingAdmin && !checkingStaff && profile && profile.role === 'user') {
      router.push("/user-dashboard");
    }
  }, [loading, checkingAdmin, checkingStaff, profile, router]);

  useEffect(() => {
    const list = visitsList || [];
    if (list.length === 0) {
      setStats({ today: 0, week: 0, month: 0 });
      return;
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());

    setStats({
      today: list.filter((v: any) => v.timeIn?.toDate && v.timeIn.toDate() >= startOfDay).length,
      week: list.filter((v: any) => v.timeIn?.toDate && v.timeIn.toDate() >= startOfWeek).length,
      month: list.length
    });
  }, [visitsList]);

  const chartData = useMemo(() => {
    const list = visitsList || [];
    if (list.length === 0) return [];

    const groupedData: Record<string, number> = {};
    list.forEach((v: any) => {
      if (!v.timeIn?.toDate) return;
      const date = v.timeIn.toDate();
      let key = "";

      if (timeRange === "hourly") {
        key = date.toLocaleTimeString([], { hour: 'numeric', hour12: true });
      } else if (timeRange === "daily") {
        key = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      } else if (timeRange === "weekly") {
        const start = new Date(date);
        start.setDate(date.getDate() - date.getDay());
        key = `Week of ${start.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
      } else if (timeRange === "monthly") {
        key = date.toLocaleDateString([], { month: 'long' });
      } else if (timeRange === "yearly") {
        key = date.getFullYear().toString();
      }

      if (key) groupedData[key] = (groupedData[key] || 0) + 1;
    });

    return Object.entries(groupedData).map(([name, count]) => ({ name, count })).reverse();
  }, [visitsList, timeRange]);

  const toggleBlockUser = async (userId: string, currentStatus: boolean) => {
    if (profile?.role !== 'admin') return;
    try {
      await updateDoc(doc(db, "users", userId), { isBlocked: !currentStatus });
      toast({ title: !currentStatus ? "User Blocked" : "User Unblocked" });
    } catch (error) {
      console.error(error);
    }
  };

  const updateUserRole = async (userId: string, newRole: "admin" | "staff" | "user") => {
    if (profile?.role !== 'admin') return;
    try {
      await updateDoc(doc(db, "users", userId), { role: newRole });
      const adminRef = doc(db, "roles_admin", userId);
      const staffRef = doc(db, "roles_staff", userId);
      await deleteDoc(adminRef);
      await deleteDoc(staffRef);
      if (newRole === "admin") await setDoc(adminRef, { active: true });
      else if (newRole === "staff") await setDoc(staffRef, { active: true });
      toast({ title: "Role Updated" });
    } catch (error) {
      console.error(error);
    }
  };

  const deleteVisit = async (visitId: string) => {
    if (profile?.role !== 'admin') return;
    try {
      await deleteDoc(doc(db, "visits", visitId));
      toast({ title: "Log Deleted" });
    } catch (error) {
      console.error(error);
    }
  };

  const filteredUsers = (usersList || []).filter(u => {
    const matchesSearch = (u.email?.toLowerCase() || "").includes(searchTerm.toLowerCase()) || 
                         (u.displayName?.toLowerCase() || "").includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    const matchesCollege = collegeFilter === "all" || u.college === collegeFilter;
    return matchesSearch && matchesRole && matchesCollege;
  });

  const filteredVisits = (visitsList || []).filter(v => {
    const matchesSearch = (v.userId?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
                         (Array.isArray(v.reasons) && v.reasons.some((r: string) => r.toLowerCase().includes(searchTerm.toLowerCase())));
    const matchesPurpose = purposeFilter === "all" || (Array.isArray(v.reasons) && v.reasons.includes(purposeFilter));
    return matchesSearch && matchesPurpose;
  });

  if (loading || checkingAdmin || checkingStaff) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-[#0B3D73] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isActuallyAuthorized) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#F5F5F5] p-4">
        <Card className="max-w-xl w-full rounded-3xl overflow-hidden shadow-2xl">
          <CardHeader className="text-center">
            <ShieldAlert className="w-16 h-16 text-amber-600 mx-auto mb-4" />
            <CardTitle className="text-2xl font-black text-[#0B3D73]">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-center text-muted-foreground">Manual Firestore provisioning is required for your account or you do not have sufficient privileges.</p>
            <div className="bg-slate-50 p-4 rounded-xl font-mono text-xs break-all text-center">
              Your UID: {user?.uid}
              <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(user?.uid || "")} className="mt-2 w-full">Copy UID</Button>
            </div>
            <Button onClick={() => window.location.reload()} className="w-full h-12 neu-button-gold rounded-xl font-bold">Refresh Session</Button>
            <Button variant="ghost" onClick={logout} className="w-full">Sign Out</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F5F5F5] overflow-hidden">
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 neu-bg-blue text-white transition-transform duration-300 transform md:relative md:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-8 flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-[#D4AF37]" />
            <div>
              <h1 className="text-xl font-black tracking-tighter">NEU ADMIN</h1>
              <p className="text-[10px] opacity-60 font-black tracking-widest uppercase">Library Hub</p>
            </div>
          </div>
          <nav className="flex-1 px-4 space-y-1">
            {[
              { id: "overview", icon: LayoutDashboard, label: "Dashboard" },
              { id: "users", icon: Users, label: "Members" },
              { id: "visits", icon: History, label: "Visit Logs" },
            ].map((item) => (
              <button 
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={cn(
                  "w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all",
                  activeTab === item.id ? "bg-white/10 text-white shadow-inner" : "text-white/60 hover:text-white hover:bg-white/5"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
          </nav>
          
          <div className="p-6 border-t border-white/10 space-y-4">
            <Link href="/user-dashboard">
              <Button variant="ghost" className="w-full h-12 text-white/60 hover:text-white hover:bg-white/5 rounded-2xl font-bold justify-start px-6 gap-3">
                <BookOpen className="w-5 h-5 text-[#D4AF37]" />
                Student View
              </Button>
            </Link>
            
            <Button 
              variant="outline" 
              onClick={logout} 
              className="group w-full h-12 border-white/10 text-white hover:bg-white hover:text-[#0B3D73] rounded-2xl font-bold transition-all"
            >
              <LogOut className="w-4 h-4" /> 
              <span className="ml-2 overflow-hidden opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap">Sign Out</span>
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-20 bg-white border-b flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <button className="md:hidden" onClick={() => setSidebarOpen(true)}><Menu className="w-6 h-6" /></button>
            <h2 className="text-2xl font-black font-headline text-[#0B3D73] capitalize">{activeTab}</h2>
          </div>
          {activeTab !== "overview" && (
            <div className="flex-1 max-w-md ml-8">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-[#0B3D73]" />
                <Input 
                  placeholder={activeTab === 'users' ? "Search Name/Email..." : "Search UID/Purpose..."} 
                  className="pl-12 h-11 bg-slate-50 border-none rounded-2xl"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {activeTab === "overview" && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: "Daily Total", val: stats.today, color: "neu-bg-blue", icon: Clock },
                  { label: "Weekly Total", val: stats.week, color: "bg-emerald-600", icon: TrendingUp },
                  { label: "Grand Total", val: stats.month, color: "bg-amber-600", icon: History },
                ].map((s, i) => (
                  <Card key={i} className="bg-white border-none shadow-xl rounded-3xl overflow-hidden">
                    <div className={cn("h-2 w-full", s.color)} />
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</span>
                        <s.icon className="w-4 h-4 text-slate-300" />
                      </div>
                    </CardHeader>
                    <CardContent><div className="text-4xl font-black text-[#0B3D73]">{s.val}</div></CardContent>
                  </Card>
                ))}
              </div>

              <Card className="rounded-3xl border-none shadow-xl">
                <CardHeader className="flex flex-row items-center justify-between p-8 border-b border-slate-50">
                  <div>
                    <CardTitle className="text-lg font-black text-[#0B3D73]">Visitor Trends</CardTitle>
                    <CardDescription>Visualizing library traffic over time</CardDescription>
                  </div>
                  <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="w-[180px] rounded-xl bg-slate-50 border-none">
                      <SelectValue placeholder="Time Period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} />
                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                        <Line type="monotone" dataKey="count" stroke="#0B3D73" strokeWidth={4} dot={{ r: 4, fill: '#0B3D73', strokeWidth: 2 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === "users" && (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-4">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[180px] rounded-xl bg-white border-none shadow-md">
                    <Filter className="w-3 h-3 mr-2 opacity-40" />
                    <SelectValue placeholder="Access Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Access Levels</SelectItem>
                    <SelectItem value="admin">Administrators</SelectItem>
                    <SelectItem value="staff">Library Staff</SelectItem>
                    <SelectItem value="user">Students</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={collegeFilter} onValueChange={setCollegeFilter}>
                  <SelectTrigger className="w-[240px] rounded-xl bg-white border-none shadow-md">
                    <Filter className="w-3 h-3 mr-2 opacity-40" />
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {COLLEGES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Card className="rounded-3xl border-none shadow-xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="pl-8 font-black text-[10px] uppercase text-slate-400">Member</TableHead>
                      <TableHead className="font-black text-[10px] uppercase text-slate-400">Department</TableHead>
                      <TableHead className="font-black text-[10px] uppercase text-slate-400">Access</TableHead>
                      <TableHead className="font-black text-[10px] uppercase text-slate-400">Status</TableHead>
                      <TableHead className="pr-8 text-right font-black text-[10px] uppercase text-slate-400">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map(u => (
                      <TableRow key={u.id}>
                        <TableCell className="pl-8 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-[#0B3D73]">{u.displayName?.charAt(0)}</div>
                            <div>
                              <p className="font-black text-sm text-slate-800">{u.displayName}</p>
                              <p className="text-[10px] text-slate-400 font-bold">{u.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-bold text-slate-500">{u.college || "N/A"}</TableCell>
                        <TableCell>
                          <span className={cn(
                            "px-2 py-1 rounded-lg text-[10px] font-black uppercase",
                            u.role === 'admin' ? "bg-purple-100 text-purple-700" : u.role === 'staff' ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
                          )}>{u.role}</span>
                        </TableCell>
                        <TableCell><Switch checked={!u.isBlocked} onCheckedChange={() => toggleBlockUser(u.id, u.isBlocked)} /></TableCell>
                        <TableCell className="pr-8 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-2xl shadow-xl">
                              <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-400 px-3">Quick Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => updateUserRole(u.id, "user")}>Assign Student</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateUserRole(u.id, "staff")}>Assign Staff</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateUserRole(u.id, "admin")}>Assign Admin</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {activeTab === "visits" && (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-4">
                <Select value={purposeFilter} onValueChange={setPurposeFilter}>
                  <SelectTrigger className="w-[220px] rounded-xl bg-white border-none shadow-md">
                    <Filter className="w-3 h-3 mr-2 opacity-40" />
                    <SelectValue placeholder="Filter by Purpose" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Purposes</SelectItem>
                    {REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Card className="rounded-3xl border-none shadow-xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="pl-8 font-black text-[10px] uppercase text-slate-400">Timestamp</TableHead>
                      <TableHead className="font-black text-[10px] uppercase text-slate-400">User UID</TableHead>
                      <TableHead className="font-black text-[10px] uppercase text-slate-400">Selected Purposes</TableHead>
                      <TableHead className="pr-8 text-right font-black text-[10px] uppercase text-slate-400">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVisits.map((v: any) => (
                      <TableRow key={v.id}>
                        <TableCell className="pl-8 py-4"><p className="text-sm font-bold text-slate-800">{v.timeIn?.toDate()?.toLocaleString() || 'N/A'}</p></TableCell>
                        <TableCell className="font-mono text-[10px] text-slate-400">{v.userId}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {Array.isArray(v.reasons) ? v.reasons.map((r: string) => (
                              <span key={r} className="px-2 py-0.5 bg-blue-50 text-[9px] font-bold text-[#0B3D73] rounded-md border border-blue-100">{r}</span>
                            )) : <span className="text-[9px] text-slate-400 font-bold">{v.reason || 'N/A'}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="pr-8 text-right">
                          <Button variant="ghost" size="icon" onClick={() => deleteVisit(v.id)} className="text-rose-500 hover:text-rose-700 hover:bg-rose-50"><Trash2 className="w-4 h-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
