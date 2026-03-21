"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { useElementInView } from "@/hooks/use-scroll-progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Mail,
  Shield,
  Bell,
  Palette,
  RotateCcw,
  LogOut,
  ChevronRight,
  AlertTriangle,
  Save,
} from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const ref = useRef<HTMLDivElement>(null);
  const { hasBeenInView } = useElementInView(ref, { threshold: 0.1 });
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [dailyReminder, setDailyReminder] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(false);

  return (
    <div ref={ref} className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className={cn("opacity-0", hasBeenInView && "animate-fade-in-up")}>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3"
          style={{ fontFamily: "var(--font-fredoka)" }}>
          👤 Profile & Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and preferences
        </p>
      </div>

      {/* User Info Card */}
      <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm opacity-0 animate-fade-in-up"
        style={{ animationDelay: "200ms" }}>
        <div className="flex items-center gap-5 mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
            <span className="text-3xl font-bold text-white" style={{ fontFamily: "var(--font-fredoka)" }}>
              A
            </span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Alex</h2>
            <p className="text-sm text-muted-foreground">Student • Joined March 2026</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">
                Moderate Dyslexia
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                Week 3/8
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
              <User className="w-3.5 h-3.5" /> Name
            </Label>
            <Input id="name" defaultValue="Alex" className="rounded-xl h-10" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-email" className="text-sm font-medium flex items-center gap-2">
              <Mail className="w-3.5 h-3.5" /> Email
            </Label>
            <Input id="profile-email" defaultValue="alex@example.com" className="rounded-xl h-10" />
          </div>
        </div>

        <Button className="mt-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground" size="sm">
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      {/* Notifications */}
      <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm opacity-0 animate-fade-in-up"
        style={{ animationDelay: "400ms" }}>
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Bell className="w-4 h-4" /> Notifications
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Push Notifications</p>
              <p className="text-xs text-muted-foreground">Get notified about new exercises and achievements</p>
            </div>
            <Switch checked={notifications} onCheckedChange={setNotifications} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Daily Reminder</p>
              <p className="text-xs text-muted-foreground">Receive a daily nudge to complete your training</p>
            </div>
            <Switch checked={dailyReminder} onCheckedChange={setDailyReminder} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Weekly Progress Report</p>
              <p className="text-xs text-muted-foreground">Get a summary of your weekly progress via email</p>
            </div>
            <Switch checked={weeklyReport} onCheckedChange={setWeeklyReport} />
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-card rounded-2xl border border-red-200/50 p-6 shadow-sm opacity-0 animate-fade-in-up"
        style={{ animationDelay: "600ms" }}>
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-red-500" /> Account Actions
        </h3>
        <div className="space-y-3">
          {/* Reset Progress */}
          <div className="flex items-center justify-between p-3 rounded-xl hover:bg-red-50/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center">
                <RotateCcw className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Reset All Progress</p>
                <p className="text-xs text-muted-foreground">Start fresh from the beginning</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="rounded-lg border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => setShowResetConfirm(true)}>
              Reset
            </Button>
          </div>

          {/* Reset Confirmation */}
          {showResetConfirm && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 animate-fade-in">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Are you sure?</p>
                  <p className="text-xs text-red-600 mt-1">
                    This will permanently delete all your progress, test results, and training data.
                    This action cannot be undone.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="destructive" className="rounded-lg text-xs">
                      Yes, Reset Everything
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-lg text-xs"
                      onClick={() => setShowResetConfirm(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Logout */}
          <Link href="/login"
            className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary transition-colors group">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                <LogOut className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Log Out</p>
                <p className="text-xs text-muted-foreground">Sign out of your account</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Link>
        </div>
      </div>
    </div>
  );
}
