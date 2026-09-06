"use client";

import { useState, useRef, useEffect } from "react";
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
  Loader2,
  Copy,
  Key,
  Check,
} from "lucide-react";
import { setUser } from "@/lib/auth";
import { api } from "@/lib/api";

export default function ProfilePage() {
  const ref = useRef<HTMLDivElement>(null);
  const { hasBeenInView } = useElementInView(ref, { threshold: 0.1 });
  
  // State for data
  const [userData, setUserData] = useState<any>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [gender, setGender] = useState("");
  const [role, setRole] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [shareKey, setShareKey] = useState("");
  const [keyCopied, setKeyCopied] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  
  const [notifications, setNotifications] = useState(true);
  const [dailyReminder, setDailyReminder] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(false);
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Load profile on mount
  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await api.get("/auth/profile");
        if (data && data.success) {
          const profile = data.data;
          setUserData(profile);
          setName(profile.name);
          setEmail(profile.email);
          setAge(profile.age || "");
          setGender(profile.gender || "");
          setRole(profile.role || "");
          setMobileNumber(profile.mobile_number || "");
          setCountryCode(profile.country_code || "+1");
          setShareKey(profile.share_key || "");
          setNotifications(profile.settings.push_notifications);
          setDailyReminder(profile.settings.daily_reminders);
          setWeeklyReport(profile.settings.weekly_reports);
          
          // Update local storage to sync with sidebar
          setUser(profile.name, profile.role || "Student");
        }
      } catch (err) {
        console.error("Profile load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = await api.post("/auth/profile", {
        name,
        age: age === "" ? null : Number(age),
        gender,
        role,
        mobile_number: mobileNumber,
        country_code: countryCode,
        password: newPassword || undefined,
        settings: {
          push_notifications: notifications,
          daily_reminders: dailyReminder,
          weekly_reports: weeklyReport
        }
      });
      if (data && data.success) {
        setUser(name, role);
        setUserData({ ...userData, name });
      }
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await api.post("/auth/reset-progress", {});
      // Redirect to dashboard to start fresh
      window.location.href = '/dashboard';
    } catch (err) {
      console.error("Reset error:", err);
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-muted-foreground animate-pulse">Loading your profile...</p>
      </div>
    );
  }

  const joinedDate = userData?.joined_at ? new Date(userData.joined_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : 'March 2026';

  return (
    <div ref={ref} className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className={cn("opacity-0", hasBeenInView && "animate-fade-in-up")}>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3"
          style={{ fontFamily: "var(--font-fredoka)" }}>
          <User className="w-7 h-7 text-primary" />
          Profile & Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and preferences
        </p>
      </div>

      {/* User Info Card */}
      <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm animate-fade-in-up"
        style={{ animationDelay: "200ms" }}>
        <div className="flex items-center gap-5 mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
            <span className="text-3xl font-bold text-white" style={{ fontFamily: "var(--font-fredoka)" }}>
              {name?.charAt(0) || 'U'}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{name || 'User'}</h2>
            <p className="text-sm text-muted-foreground">{role ? `${role.charAt(0).toUpperCase() + role.slice(1)}` : 'Member'} • Joined {joinedDate}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                Mentis Member
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
              <User className="w-3.5 h-3.5" /> Name
            </Label>
            <Input 
              id="name" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl h-10" 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-email" className="text-sm font-medium flex items-center gap-2">
              <Mail className="w-3.5 h-3.5" /> Email
            </Label>
            <Input 
              id="profile-email" 
              value={email} 
              readOnly
              className="rounded-xl h-10 bg-secondary/30 text-muted-foreground cursor-not-allowed border-dashed" 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="age" className="text-sm font-medium">Age</Label>
            <Input 
              id="age" 
              type="number"
              value={age} 
              onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="Enter your age"
              className="rounded-xl h-10" 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender" className="text-sm font-medium">Gender</Label>
            <select
              id="gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full rounded-xl h-10 px-3 bg-secondary/20 border border-border outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role" className="text-sm font-medium">I am a...</Label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-xl h-10 px-3 bg-secondary/20 border border-border outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
            >
              <option value="">Select Role</option>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="doctor">Doctor</option>
              <option value="parent">Parent</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mobile" className="text-sm font-medium">Mobile Number</Label>
            <div className="flex gap-2">
              <select
                id="country-code"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-24 rounded-xl h-10 px-2 bg-secondary/20 border border-border outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
              >
                <option value="+1">+1 (US)</option>
                <option value="+44">+44 (UK)</option>
                <option value="+91">+91 (IN)</option>
                <option value="+61">+61 (AU)</option>
                <option value="+81">+81 (JP)</option>
                <option value="+49">+49 (DE)</option>
                <option value="+33">+33 (FR)</option>
                <option value="+86">+86 (CN)</option>
                <option value="+55">+55 (BR)</option>
                <option value="+27">+27 (ZA)</option>
                <option value="+971">+971 (AE)</option>
                <option value="+65">+65 (SG)</option>
              </select>
              <Input 
                id="mobile" 
                value={mobileNumber} 
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder="Mobile number"
                className="rounded-xl h-10 flex-1" 
              />
            </div>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="new-password" title="Leave blank to keep current password" className="text-sm font-medium flex items-center gap-2">
              <Shield className="w-3.5 h-3.5" /> Change Password
            </Label>
            <Input 
              id="new-password" 
              type="password"
              placeholder="Enter new password (optional)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="rounded-xl h-10" 
            />
            <p className="text-[10px] text-muted-foreground ml-1">Leave blank to keep current password</p>
          </div>
        </div>

        <Button 
          className="mt-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground" 
          size="sm"
          disabled={saving}
          onClick={handleSave}
        >
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Portal Share Key */}
      {shareKey && (
        <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl border border-primary/20 p-6 shadow-sm animate-fade-in-up"
          style={{ animationDelay: "300ms" }}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Key className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Portal Share Key</h3>
                <p className="text-xs text-muted-foreground">Give this key to your doctor or teacher so they can view your reports</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex-1 bg-white border-2 border-dashed border-primary/30 rounded-xl px-5 py-3 font-mono text-xl font-bold text-primary tracking-[0.3em] text-center select-all">
              {shareKey}
            </div>
            <Button
              variant="outline"
              size="sm"
              className={`rounded-xl px-4 h-12 border-primary/20 transition-all ${
                keyCopied ? 'bg-green-50 border-green-200 text-green-600' : 'text-primary hover:bg-primary/10'
              }`}
              onClick={() => {
                navigator.clipboard.writeText(shareKey);
                setKeyCopied(true);
                setTimeout(() => setKeyCopied(false), 2000);
              }}
            >
              {keyCopied ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
              {keyCopied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>
      )}

      {/* Notifications */}
      <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm animate-fade-in-up"
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
      <div className="bg-card rounded-2xl border border-red-200/50 p-6 shadow-sm animate-fade-in-up"
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
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      className="rounded-lg text-xs"
                      onClick={handleReset}
                      disabled={resetting}
                    >
                      {resetting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                      Yes, Reset Everything
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-lg text-xs"
                      onClick={() => setShowResetConfirm(false)}
                      disabled={resetting}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Logout */}
          <button 
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user_name');
              window.location.href = '/login';
            }}
            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-secondary transition-colors group">
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
          </button>
        </div>
      </div>
    </div>
  );
}
