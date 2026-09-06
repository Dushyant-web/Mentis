"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ClipboardCheck,
  GraduationCap,
  TrendingUp,
  User,
  Users,
  Menu,
  X,
  LogOut,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getUser } from "@/lib/auth";
import { api } from "@/lib/api";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/assessment", icon: ClipboardCheck, label: "Assessment" },
  { href: "/training", icon: GraduationCap, label: "Training" },
  { href: "/progress", icon: TrendingUp, label: "Progress" },
  { href: "/portal", icon: Users, label: "Portal" },
  { href: "/profile", icon: User, label: "Profile" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [hasAssessment, setHasAssessment] = useState<boolean | null>(null);

  useEffect(() => {
    setMounted(true);
    const update = () => setUser(getUser());
    update();
    
    // 🔥 SKIP DASHBOARD CHECK DURING ASSESSMENT MODE
    // This prevents the 401 interceptor from wiping the token mid-test
    const isAssessmentMode = pathname.includes("/reading-test") || pathname.includes("/writing-test") || pathname.includes("/analysis") || pathname.includes("/diagnosis");
    
    if (!isAssessmentMode) {
      // 🔥 HIGH-SPEED ASSESSMENT CACHE
      const checkAssessment = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;

        // 1. Try Cache First (Fast Path)
        const cachedStatus = localStorage.getItem("has_completed_assessment");
        if (cachedStatus === "true") {
          setHasAssessment(true);
          return; // Already done, no need to block navigation
        }

        try {
          // 2. Network Check (Slow Path - only happens once or until success)
          const res = await api.get("/dashboard/summary");
          const assessmentDone = !!res?.summary?.prediction;
          
          if (assessmentDone) {
            localStorage.setItem("has_completed_assessment", "true");
            setHasAssessment(true);
          } else {
            setHasAssessment(false);
            
            // 🔥 COMPULSORY REDIRECTION (ONLY FOR STUDENTS)
            const userRole = localStorage.getItem("user_role")?.toLowerCase() || "student";
            if (userRole === "student") {
              const isAssessmentPath = pathname === "/assessment" || pathname.includes("/reading-test") || pathname.includes("/writing-test");
              if (!isAssessmentPath && pathname !== "/profile") {
                router.push("/assessment");
              }
            }
          }
        } catch (e) {
          console.error("Assessment check failed", e);
        }
      };
      
      checkAssessment();
    }

    window.addEventListener("user-updated", update);
    window.addEventListener("storage", update); 
    return () => {
      window.removeEventListener("user-updated", update);
      window.removeEventListener("storage", update);
    };
  }, [pathname, router]);

  const userName = mounted && user?.name ? user.name : "User";
  const userInitial = userName.charAt(0).toUpperCase();

  const isAssessmentMode = pathname.includes("/reading-test") || pathname.includes("/writing-test") || pathname.includes("/analysis");

  return (
    <div className="min-h-screen bg-background flex overflow-x-hidden">
      {/* Desktop sidebar */}
      {!isAssessmentMode && (
        <aside
          className={cn(
            "hidden md:flex flex-col fixed left-0 top-0 h-full bg-card border-r border-border z-40 transition-all duration-300",
            collapsed ? "w-20" : "w-64"
          )}
        >
        {/* Logo */}
        <div className="p-5 flex items-center gap-3 border-b border-border">
          <Link href="/" className="flex items-center group">
            {collapsed ? (
              <img
                src="/mentis-mark.svg"
                alt="MENTIS"
                className="w-10 h-10 flex-shrink-0 transition-transform group-hover:scale-110"
              />
            ) : (
              <img
                src="/mentis-logo.svg"
                alt="MENTIS"
                className="h-9 transition-transform group-hover:scale-105"
              />
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "ml-auto p-1.5 rounded-lg hover:bg-secondary transition-colors",
              collapsed && "ml-0"
            )}
          >
            <ChevronLeft className={cn("w-4 h-4 transition-transform", collapsed && "rotate-180")} />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  collapsed && "justify-center px-2"
                )}
              >
                {collapsed ? (
                  <item.icon className="w-5 h-5 flex-shrink-0" aria-label={item.label} />
                ) : (
                  <>
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <span>{item.label}</span>
                    {isActive && (
                      <div className="ml-auto w-2 h-2 rounded-full bg-primary animate-pulse-soft" />
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="p-3 border-t border-border">
          <div className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl bg-secondary/50",
            collapsed && "justify-center px-2"
          )}>
            <span className="text-sm font-bold text-primary" suppressHydrationWarning>
              {userInitial}
            </span>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{userName}</p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role || 'Student'}</p>
              </div>
            )}
          </div>
        </div>
        </aside>
      )}

      {/* Mobile header */}
      {!isAssessmentMode && (
        <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center">
            <img src="/mentis-logo.svg" alt="MENTIS" className="h-8" />
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>
      )}

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)} />
          <div className="absolute top-0 left-0 h-full w-72 bg-card shadow-2xl animate-slide-in-left">
            <div className="p-4 pt-20">
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-8 pt-6 border-t border-border">
                <Link
                  href="/login"
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Log Out</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className={cn(
        "flex-1 min-w-0 transition-all duration-300",
        !isAssessmentMode ? (collapsed ? "md:ml-20" : "md:ml-64") : "md:ml-0",
        !isAssessmentMode ? "pt-16 md:pt-0" : "pt-0"
      )}>
        <div className="p-4 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
