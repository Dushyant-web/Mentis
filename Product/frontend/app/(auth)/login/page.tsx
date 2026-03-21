"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ArrowRight, Sparkles } from "lucide-react";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate login
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 1500);
  };

  return (
    <div className="w-full max-w-md">


      {/* Login Card */}
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-xl transform rotate-2" />
        <div className="relative bg-card/95 backdrop-blur-md rounded-3xl border border-border/50 shadow-2xl p-8 opacity-0 animate-fade-in-up"
          style={{ animationDelay: "800ms" }}>
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4 opacity-0 animate-fade-in-up"
              style={{ animationDelay: "1000ms" }}>
              <Sparkles className="w-3 h-3" />
              Welcome Back!
            </div>
            <h1
              className="text-3xl font-bold text-foreground mb-2 opacity-0 animate-fade-in-up"
              style={{ fontFamily: "var(--font-fredoka)", animationDelay: "1100ms" }}
            >
              Log In to <span className="gradient-text">MENTIS</span>
            </h1>
            <p className="text-muted-foreground text-sm opacity-0 animate-fade-in-up"
              style={{ animationDelay: "1200ms" }}>
              Let&apos;s continue your learning adventure! 🚀
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2 opacity-0 animate-fade-in-up"
              style={{ animationDelay: "1300ms" }}>
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address
              </Label>
              <div className="relative group">
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 rounded-xl border-border/60 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all pl-4"
                />
                <div className="absolute inset-0 rounded-xl bg-primary/5 opacity-0 group-focus-within:opacity-100 transition-opacity -z-10" />
              </div>
            </div>

            <div className="space-y-2 opacity-0 animate-fade-in-up"
              style={{ animationDelay: "1400ms" }}>
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative group">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 rounded-xl border-border/60 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all pl-4 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-secondary transition-colors text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <div className="absolute inset-0 rounded-xl bg-primary/5 opacity-0 group-focus-within:opacity-100 transition-opacity -z-10" />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm opacity-0 animate-fade-in-up"
              style={{ animationDelay: "1500ms" }}>
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
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all opacity-0 animate-fade-in-up"
              style={{ animationDelay: "1600ms" }}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Logging in...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  Let&apos;s Go!
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6 opacity-0 animate-fade-in-up"
            style={{ animationDelay: "1700ms" }}>
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Social login */}
          <div className="space-y-3 opacity-0 animate-fade-in-up"
            style={{ animationDelay: "1800ms" }}>
            <Button
              variant="outline"
              className="w-full h-11 rounded-xl border-border/60 hover:bg-secondary hover:border-primary/30 transition-all"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </Button>
          </div>

          {/* Sign up link */}
          <p className="text-center text-sm text-muted-foreground mt-6 opacity-0 animate-fade-in-up"
            style={{ animationDelay: "1900ms" }}>
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-primary font-semibold hover:underline">
              Sign Up Free! ✨
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
