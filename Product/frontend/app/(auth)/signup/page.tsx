"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Eye, EyeOff, ArrowRight, Rocket } from "lucide-react";
import { api, GOOGLE_CLIENT_ID } from "@/lib/api";
import { setToken, setUser } from "@/lib/auth";

declare global {
  interface Window {
    google: any;
  }
}

export default function SignupPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    age: "",
    gender: "",
    role: "",
    otherRole: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // If already logged in, skip to dashboard
    if (localStorage.getItem("token")) {
      router.push("/dashboard");
      return;
    }

    const initGoogle = () => {
      if (!GOOGLE_CLIENT_ID) {
        console.error("NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set — Google sign-in is disabled.");
        return;
      }
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
          ux_mode: 'popup',
        });
        
        window.google.accounts.id.renderButton(
          document.getElementById("google-signup-button"),
          { 
            theme: "outline", 
            size: "large", 
            width: "384",
            text: "continue_with",
            shape: "rectangular"
          }
        );
      }
    };
    
    const timer = setInterval(() => {
      if (window.google) {
        initGoogle();
        clearInterval(timer);
      }
    }, 500);
    
    return () => clearInterval(timer);
  }, [formData]); // Re-render button if data changes to ensure callback has latest state if needed

  const handleGoogleResponse = async (response: any) => {
    setIsLoading(true);
    try {
      const res = await api.request("/auth/google", "POST", {
        token: response.credential,
        age: formData.age ? parseInt(formData.age) : null,
        gender: formData.gender,
        role: formData.role === "other" ? formData.otherRole : formData.role
      });
      
      setToken(res.access_token);
      setUser(res.name, res.role);
      window.location.href = "/dashboard";
    } catch (err: any) {
      console.error("Google auth failed:", err);
      alert(err?.message || "Google login failed. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleClick = () => {
    if (window.google) {
      window.google.accounts.id.prompt();
    } else {
      alert("Google login is still loading. Please wait a moment.");
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.request("/auth/signup", "POST", {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        age: formData.age ? parseInt(formData.age) : null,
        gender: formData.gender,
        role: formData.role === "other" ? formData.otherRole : formData.role
      });

      setToken(res.access_token);
      setUser(res.name, res.role);
      window.location.href = "/dashboard";
    } catch (err: any) {
      console.error("Signup failed:", err);
      alert(err?.message || "Signup failed. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md my-10">
      {/* Signup Card */}
      <div className="relative">
        <div className="absolute inset-0 bg-accent/30 rounded-3xl blur-xl transform -rotate-2" />
        <div
          className="relative bg-card/95 backdrop-blur-md rounded-3xl border border-border/50 shadow-2xl p-8 opacity-0 animate-fade-in-up"
          style={{ animationDelay: "200ms" }}
        >
          {/* Header */}
          <div className="text-center mb-6">
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/30 text-foreground text-xs font-medium mb-4"
            >
              <Rocket className="w-3 h-3" />
              Join the Adventure!
            </div>
            <h1
              className="text-3xl font-bold text-foreground mb-2"
              style={{ fontFamily: "var(--font-fredoka)" }}
            >
              Create Your <span className="gradient-text">Account</span>
            </h1>
            <p className="text-muted-foreground text-sm">
              Start your brain training journey today!
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">Your Name</Label>
              <Input
                id="name"
                placeholder="What should we call you?"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                required
                className="h-11 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age" className="text-sm font-medium">Age</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="Your age"
                  value={formData.age}
                  onChange={(e) => handleChange("age", e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender" className="text-sm font-medium">Gender</Label>
                <Select value={formData.gender} onValueChange={(val) => handleChange("gender", val)}>
                  <SelectTrigger className="h-11 rounded-xl bg-background">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="private">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="text-sm font-medium">Who are you?</Label>
              <Select value={formData.role} onValueChange={(val) => handleChange("role", val)}>
                <SelectTrigger className="h-11 rounded-xl bg-background">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="other">Other (Please specify)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.role === "other" && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                <Input
                  placeholder="Specify your role..."
                  value={formData.otherRole}
                  onChange={(e) => handleChange("otherRole", e.target.value)}
                  required
                  className="h-11 rounded-xl"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="signup-email" className="text-sm font-medium">Email Address</Label>
              <Input
                id="signup-email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                required
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  required
                  className="h-11 rounded-xl pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-sm font-medium">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Type it again!"
                value={formData.confirmPassword}
                onChange={(e) => handleChange("confirmPassword", e.target.value)}
                required
                className="h-11 rounded-xl"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base shadow-lg transition-all"
            >
              {isLoading ? "Creating account..." : "Start My Journey!"}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Social login */}
          <div id="google-signup-button" className="w-full flex justify-center" />

          {/* Login link */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
