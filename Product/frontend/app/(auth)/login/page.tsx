"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ArrowRight, Sparkles } from "lucide-react";

import { api, GOOGLE_CLIENT_ID } from "@/lib/api";
import { setToken, setUser } from "@/lib/auth";

declare global {
  interface Window {
    google: any;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
          document.getElementById("google-login-button"),
          { 
            theme: "outline", 
            size: "large", 
            width: "384",
            text: "signin_with",
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
  }, []);

  const handleGoogleResponse = async (response: any) => {
    setIsLoading(true);
    try {
      const res = await api.request("/auth/google", "POST", {
        token: response.credential,
      });
      
      setToken(res.access_token);
      setUser(res.name, res.role);
      window.location.href = "/dashboard";
    } catch (err: any) {
      console.error("Google login failed:", err);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await api.request("/auth/login", "POST", {
        email,
        password,
      });

      setToken(res.access_token);
      setUser(res.name, res.role);
      window.location.href = "/dashboard";
    } catch (err: any) {
      console.error("Login failed:", err);
      alert(err?.message || "Invalid credentials or server error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Login Card */}
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-xl transform rotate-2" />
        <div className="relative bg-card/95 backdrop-blur-md rounded-3xl border border-border/50 shadow-2xl p-8 opacity-0 animate-fade-in-up"
          style={{ animationDelay: "200ms" }}>
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
              <Sparkles className="w-3 h-3" />
              Welcome Back!
            </div>
            <h1
              className="text-3xl font-bold text-foreground mb-2"
              style={{ fontFamily: "var(--font-fredoka)" }}
            >
              Log In to <span className="gradient-text">MENTIS</span>
            </h1>
            <p className="text-muted-foreground text-sm">
              Let&apos;s continue your learning adventure!
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 rounded-xl pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-border accent-primary" />
                <span className="text-muted-foreground">Remember me</span>
              </label>
              <Link href="#" className="text-primary hover:underline font-medium">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base shadow-lg transition-all"
            >
              {isLoading ? "Logging in..." : "Let's Go!"}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Social login */}
          <div id="google-login-button" className="w-full flex justify-center" />

          {/* Sign up link */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-primary font-semibold hover:underline">
              Sign Up Free!
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
