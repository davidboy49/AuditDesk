"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { 
  LayoutDashboard, 
  CalendarRange, 
  AlertTriangle, 
  Users, 
  UserCheck, 
  Sun, 
  Moon,
  ChevronRight,
  ChevronDown,
  Menu,
  Bell,
  User as UserIcon,
  Lock,
  Building,
  CalendarCheck,
  History
} from "lucide-react";
import { mockUsers, User } from "@/lib/mockData";

interface AppLayoutProps {
  children: React.ReactNode;
  currentUser: User;
}

export default function AppLayout({ children, currentUser }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [theme, setTheme] = useState<"light" | "dark">("light"); // Default light just like screenshot
  const [activeUser, setActiveUser] = useState<User>(currentUser);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [auditModuleOpen, setAuditModuleOpen] = useState(true);

  // Initialize theme from localStorage or document class
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const initialTheme = savedTheme || "light"; // Default light theme
    
    setTheme(initialTheme);
    if (initialTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleUserChange = (userId: string) => {
    document.cookie = `auth_user_id=${userId}; path=/; max-age=31536000`;
    const user = mockUsers.find(u => u.id === userId);
    if (user) {
      setActiveUser(user);
    }
    router.refresh();
  };

  const menuItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Audit Planning", href: "/planning", icon: CalendarRange },
    { name: "Execution Schedule", href: "/schedule", icon: CalendarCheck },
    { name: "Audit Findings", href: "/findings", icon: AlertTriangle },
    { name: "User Management", href: "/users", icon: Users },
  ];

  if (activeUser.role === "ADMIN") {
    menuItems.push({ name: "Activity Logs", href: "/logs", icon: History });
  }

  // Dynamic breadcrumb matching screenshot structure
  const getBreadcrumb = () => {
    if (pathname.startsWith("/planning")) return "Scoping / Timeline Planning";
    if (pathname.startsWith("/schedule")) return "Execution / Execution Schedule & Document Request";
    if (pathname.startsWith("/findings")) return "Mitigation / Findings Ledger";
    if (pathname.startsWith("/users")) return "Identity / User Management";
    if (pathname.startsWith("/logs")) return "Administration / Activity Logs";
    return "Portal / Dashboard";
  };

  return (
    <div className="min-h-screen flex bg-slate-100 dark:bg-slate-950 text-foreground transition-colors duration-200">
      
      {/* Sidebar - Solid Deep Blue */}
      <aside 
        className={`${
          sidebarOpen ? "w-64" : "w-0 overflow-hidden"
        } transition-all duration-300 bg-[#063960] text-white flex flex-col justify-between shrink-0 relative shadow-lg z-20`}
      >
        {/* Background H Watermark overlay */}
        <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center overflow-hidden">
          {/* <div className="text-[280px] font-bold select-none font-mono leading-none">H</div> */}
        </div>

        <div className="z-10">
          {/* Header - "HE PORTAL" */}
          <div className="h-16 flex items-center justify-between px-5 border-b border-[#042844] shrink-0">
            <span className="font-sans font-extrabold tracking-wider text-base">Audit Portal</span>
          </div>

          {/* Profile Section - Centered avatar & name */}
          <div className="py-8 flex flex-col items-center justify-center border-b border-[#042844] space-y-3 bg-[#053254]/40">
            <div className="w-20 h-20 rounded-full bg-slate-500/50 flex items-center justify-center border border-white/10 shadow-inner">
              <UserIcon className="w-10 h-10 text-slate-300" />
            </div>
            <div className="text-center space-y-1">
              <div className="text-xs text-slate-300 font-mono flex items-center justify-center gap-1">
                <Lock className="w-3 h-3 text-slate-400" /> {activeUser.role}
              </div>
              <div className="font-bold text-sm tracking-wide uppercase text-white">
                {activeUser.name}
              </div>
            </div>
          </div>

          {/* Navigation Links with nesting */}
          <nav className="py-4 space-y-1">
            {/* Audit Module Collapsible Parent */}
            <div>
              <button
                type="button"
                onClick={() => setAuditModuleOpen(!auditModuleOpen)}
                className="w-full flex items-center justify-between px-5 py-3 text-xs font-bold text-white hover:bg-[#053254]/50 transition-all select-none cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Building className="w-4 h-4 text-slate-300" />
                  <span className="uppercase tracking-wider">Audit Module</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${auditModuleOpen ? "" : "-rotate-90"}`} />
              </button>

              {/* Nested Child Items */}
              <div 
                className={`transition-all duration-300 overflow-hidden ${
                  auditModuleOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <div className="pl-4 border-l border-[#042844] ml-7 my-1 space-y-1">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname.startsWith(item.href) || (item.href === "/dashboard" && pathname === "/");
                    
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`flex items-center justify-between px-4 py-2.5 text-[11px] font-semibold transition-all select-none rounded ${
                          isActive
                            ? "bg-[#052b49] text-white font-bold border-l-2 border-accent pl-3"
                            : "text-slate-300 hover:bg-[#053254]/30 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{item.name}</span>
                        </div>
                        <ChevronRight className="w-2.5 h-2.5 text-slate-500" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </nav>
        </div>

        {/* Sidebar Footer info */}
        <div className="p-4 border-t border-[#042844] space-y-2 bg-[#042d4c]/30 text-center z-10">
          <div className="text-[10px] text-slate-400 font-mono tracking-wider">
            {activeUser.departmentId ? `DEPT: ${mockUsers.find(u => u.id === activeUser.id)?.departmentName || "SECURITY"}` : "GLOBAL ACCESS"}
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-6 z-10 shrink-0 shadow-xs">
          
          {/* Left: Hamburger menu toggle */}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Right Controls */}
          <div className="flex items-center gap-5">
            {/* Quick RBAC Mock Switcher */}
            <div className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-800 rounded-md px-2 py-1 bg-slate-50 dark:bg-slate-800/40">
              <UserCheck className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={activeUser.id}
                onChange={(e) => handleUserChange(e.target.value)}
                className="bg-transparent text-slate-700 dark:text-slate-300 border-none text-[11px] font-mono focus:outline-none focus:ring-0 cursor-pointer"
              >
                {mockUsers.map((u) => (
                  <option key={u.id} value={u.id} className="dark:bg-slate-900">
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Notification bell */}
            <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Profile Avatar */}
            <div className="w-9 h-9 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-200 border border-slate-200 dark:border-slate-800 select-none">
              <span className="font-mono text-sm font-semibold">{activeUser.name.charAt(0)}</span>
            </div>
          </div>
        </header>

        {/* Content Breadcrumb Area */}
        <div className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800/50 py-3.5 px-8 shrink-0">
          <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            {getBreadcrumb()}
          </div>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-8 bg-slate-100 dark:bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
}
