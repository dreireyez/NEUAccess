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
  deleteDoc
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
  AlertTriangle,
  ExternalLink,
  ClipboardCheck
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
  const [stats, setStats] = useState({
    today: 0,
    week: 0,
    month: 0
  });

  // 1. Verify specific Backend Authorization via the segregation collections
  const adminDocRef = useMemoFirebase(() => user ? doc(db, "roles_admin", user.uid) : null, [db, user]);
  const staffDocRef = useMemoFirebase(() => user ? doc(db, "roles_staff", user.uid) : null, [db, user]);
  
  const { data: adminDoc, isLoading: checkingAdmin } = useDoc(adminDocRef);
  const { data: staffDoc, isLoading: checkingStaff } = useDoc(staffDocRef);

  // 2. Determine if user is truly provisioned in roles collections
  const isProvisioned = !!(adminDoc || staffDoc);
  const isProfileAdmin = profile?.role === 'admin' || profile?.role === 'staff';
  
  // 3. Strict guard: only fire global queries if both profile AND backend provisioning are verified
  const isActuallyAuthorized = !loading && !checkingAdmin && !checkingStaff && isProfileAdmin && isProvisioned;

  // Data Queries - strictly guarded by backend-verified authorization
  const usersQuery = useMemoFirebase(() => {
    if (!isActuallyAuthorized) return null;
    return collection(db, "users");
  }, [db, isActuallyAuthorized]);
  
  const { data: users = [], isLoading: usersLoading } = useCollection(usersQuery);

  const visitsQuery = useMemoFirebase(() => {
    if (!isActuallyAuthorized) return null;
    // Note: This query may require a composite index if order is used. Limit to 500 for safety.
    return query(collection(db, "visits"), orderBy("timestamp", "desc"), limit(500));
  }, [db, isActuallyAuthorized]);
  
  const { data: visits = [], isLoading: visitsLoading } = useCollection(visitsQuery);

  useEffect(() => {
    // Redirect standard students to their dashboard
    if (!loading && !checkingAdmin && !checkingStaff && profile && profile.role === 'user') {
      router.push("/user-dashboard");
    }
  }, [loading, checkingAdmin, checkingStaff, profile, router]);

  useEffect(() => {
    if (!visits || visits.length === 0) return;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const todayCount = visits.filter(v => v.timestamp?.toDate() >= startOfDay).length;
    const weekCount = visits.filter(v => v.timestamp?.toDate() >= startOfWeek).length;
    const monthCount = visits.filter(v => v.timestamp?.toDate() >= startOfMonth).length;

    setStats({
      today: todayCount,
      week: weekCount,
      month: monthCount
    });
  }, [visits]);

  const copyUid = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid);
      toast({ title: "UID Copied", description: "User ID copied to clipboard." });
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
        description: `Successfully updated status for user.`,
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
        description: `User role changed to ${newRole}. Access rules updated.`,
      });
    } catch (error: any) {
      console.error("Error updating user role:", error);
      toast({
        title: "Update Failed",
        description: "Insufficient permissions to change administrative roles.",
        variant: "destructive"
      });
    }
  };

  const filteredUsers = (users || []).filter(user => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading || checkingAdmin || checkingStaff) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#0B3D73] border-t-transparent rounded-full animate-spin" />
          <div className="text-[#0B3D73] font-bold">Verifying Secure Access...</div>
        </div>
      </div>
    );
  }

  // If role is admin/staff but not in segregation collection, they need manual provisioning
  if (isProfileAdmin && !isProvisioned) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#F5F5F5] p-4">
        <Card className="max-w-xl w-full border-none shadow-xl overflow-hidden">
          <div className="h-2 neu-bg-blue w-full" />
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-8 h-8 text-amber-600" />
            </div>
            <CardTitle className="text-2xl font-bold font-headline">Secure Provisioning Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground">
                Your profile identifies you as <span className="font-bold text-[#0B3D73]">{profile?.role}</span>, but your device is not yet authorized to list visitor data.
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5" />
                Manual Authorization Steps
              </h3>
              <ol className="text-sm text-slate-600 space-y-3 list-decimal pl-4">
                <li>
                  Go to the <strong>Firebase Console</strong> and open the Firestore Database.
                </li>
                <li>
                  Locate or create the collection: <code className="bg-slate-200 px-1 rounded text-[#0B3D73]">roles_admin</code>.
                </li>
                <li>
                  Add a new document with this <strong>UID</strong> as the Document ID:
                  <div className="mt-2 flex items-center gap-2">
                    <code className="bg-white border px-2 py-1 rounded flex-1 font-mono text-xs overflow-hidden truncate">
                      {user?.uid}
                    </code>
                    <Button size="sm" variant="outline" onClick={copyUid} className="h-8">
                      Copy UID
                    </Button>
                  </div>
                </li>
                <li>Refresh this page once the document is created.</li>
              </ol>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button onClick={() => window.location.reload()} className="flex-1 neu-button-gold">
                Check Again
              </Button>
              <Button onClick={logout} variant="outline" className="flex-1">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F5F5F5] overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 neu-bg-blue text-white transition-transform duration-300 transform md:relative md:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-6 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="bg-[#D4AF37] p-2 rounded-lg">
                <ShieldAlert className="w-6 h-6 text-[#0B3D73]" />
              </div>
              <h1 className="text-xl font-bold font-headline">Admin Panel</h1>
            </div>
            <button className="md:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            <button className="w-full flex items-center gap-3 px-4 py-3 bg-white/10 rounded-lg text-white font-medium">
              <LayoutDashboard className="w-5 h-5" />
              Overview
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 text-white/70 hover:bg-white/5 rounded-lg transition-colors">
              <Users className="w-5 h-5" />
              User Management
            </button>
          </nav>

          <div className="p-4 border-t border-white/10 space-y-4">
            <div className="flex items-center gap-3 px-2">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">
                {profile?.displayName?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{profile?.displayName}</p>
                <p className="text-xs text-white/60 capitalize">{profile?.role}</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={logout}
              className="w-full border-white/20 text-white hover:bg-white hover:text-[#0B3D73]"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b flex items-center justify-between px-4 md:px-8">
          <button className="md:hidden p-2" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6 text-[#0B3D73]" />
          </button>
          <div className="flex-1 max-w-md ml-4 md:ml-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                placeholder="Search users by name or email..." 
                className="pl-10 h-10 bg-gray-50 border-none rounded-lg"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Card className="bg-white border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 uppercase">Today's Visitors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#0B3D73]">{stats.today}</div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs text-gray-500">Live counts</span>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 uppercase">This Week</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#0B3D73]">{stats.week}</div>
                <div className="mt-2 text-xs text-gray-500">Total visits since Sunday</div>
              </CardContent>
            </Card>
            <Card className="bg-white border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 uppercase">This Month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#0B3D73]">{stats.month}</div>
                <div className="mt-2 text-xs text-gray-500">Total monthly engagement</div>
              </CardContent>
            </Card>
          </div>

          {/* User Table */}
          <section className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold font-headline">User Directory</h2>
              <p className="text-xs text-muted-foreground">Managing {filteredUsers.length} total members</p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="w-[300px]">User</TableHead>
                    <TableHead>College</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2">
                           <div className="w-6 h-6 border-2 border-[#0B3D73] border-t-transparent rounded-full animate-spin" />
                           <p className="text-xs text-muted-foreground">Loading users...</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-[#0B3D73]">
                            {user.displayName?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{user.displayName}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{user.college || 'Pending Onboarding'}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className={cn(
                              "px-2 py-0.5 h-auto rounded text-[10px] font-bold uppercase cursor-pointer transition-colors",
                              user.role === 'admin' ? "bg-purple-100 text-purple-700 hover:bg-purple-200" :
                              user.role === 'staff' ? "bg-blue-100 text-blue-700 hover:bg-blue-200" :
                              "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            )}>
                              {user.role}
                            </Button>
                          </DropdownMenuTrigger>
                          {profile?.role === 'admin' && (
                            <DropdownMenuContent align="start">
                              <DropdownMenuLabel>Change Role</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => updateUserRole(user.id, "user")}>User (Student)</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateUserRole(user.id, "staff")}>Staff</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateUserRole(user.id, "admin")}>Administrator</DropdownMenuItem>
                            </DropdownMenuContent>
                          )}
                        </DropdownMenu>
                      </TableCell>
                      <TableCell>
                        {user.isBlocked ? (
                          <div className="flex items-center gap-1.5 text-red-600">
                            <Ban className="w-3 h-3" />
                            <span className="text-xs font-medium">Blocked</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-green-600">
                            <UserCheck className="w-3 h-3" />
                            <span className="text-xs font-medium">Active</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-3">
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] text-gray-400">{user.isBlocked ? 'Unlock' : 'Lock'}</span>
                             <Switch 
                               checked={!user.isBlocked} 
                               onCheckedChange={() => toggleBlockUser(user.id, user.isBlocked)}
                               disabled={profile?.role !== 'admin' || user.id === profile?.id}
                               className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-500"
                             />
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
