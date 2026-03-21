"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ArrowRight, Rocket } from "lucide-react";

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 1500);
  };

  return (
    <div className="w-full max-w-md">


      {/* Signup Card */}
      <div className="relative">
        <div className="absolute inset-0 bg-accent/30 rounded-3xl blur-xl transform -rotate-2" />
        <div
          className="relative bg-card/95 backdrop-blur-md rounded-3xl border border-border/50 shadow-2xl p-8 opacity-0 animate-fade-in-up"
          style={{ animationDelay: "800ms" }}
        >
          {/* Header */}
          <div className="text-center mb-6">
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/30 text-foreground text-xs font-medium mb-4 opacity-0 animate-fade-in-up"
              style={{ animationDelay: "1000ms" }}
            >
              <Rocket className="w-3 h-3" />
              Join the Adventure!
            </div>
            <h1
              className="text-3xl font-bold text-foreground mb-2 opacity-0 animate-fade-in-up"
              style={{ fontFamily: "var(--font-fredoka)", animationDelay: "1100ms" }}
            >
              Create Your <span className="gradient-text">Account</span>
            </h1>
            <p
              className="text-muted-foreground text-sm opacity-0 animate-fade-in-up"
              style={{ animationDelay: "1200ms" }}
            >
              Start your brain training journey today! 🧠✨
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div
              className="space-y-2 opacity-0 animate-fade-in-up"
              style={{ animationDelay: "1300ms" }}
            >
              <Label htmlFor="name" className="text-sm font-medium">
                Your Name
              </Label>
              <div className="relative group">
                <Input
                  id="name"
                  type="text"
                  placeholder="What should we call you?"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  required
                  className="h-11 rounded-xl border-border/60 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all pl-4"
                />
              </div>
            </div>

            <div
              className="space-y-2 opacity-0 animate-fade-in-up"
              style={{ animationDelay: "1400ms" }}
            >
              <Label htmlFor="signup-email" className="text-sm font-medium">
                Email Address
              </Label>
              <div className="relative group">
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  required
                  className="h-11 rounded-xl border-border/60 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all pl-4"
                />
              </div>
            </div>

            <div
              className="space-y-2 opacity-0 animate-fade-in-up"
              style={{ animationDelay: "1500ms" }}
            >
              <Label htmlFor="signup-password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative group">
                <Input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  required
                  className="h-11 rounded-xl border-border/60 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all pl-4 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-secondary transition-colors text-muted-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div
              className="space-y-2 opacity-0 animate-fade-in-up"
              style={{ animationDelay: "1600ms" }}
            >
              <Label htmlFor="confirm-password" className="text-sm font-medium">
                Confirm Password
              </Label>
              <div className="relative group">
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Type it again!"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange("confirmPassword", e.target.value)}
                  required
                  className="h-11 rounded-xl border-border/60 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all pl-4"
                />
              </div>
            </div>

            {/* Terms */}
            <div
              className="flex items-start gap-2 opacity-0 animate-fade-in-up"
              style={{ animationDelay: "1700ms" }}
            >
              <input
                type="checkbox"
                required
                className="w-4 h-4 rounded border-border accent-primary mt-0.5"
              />
              <span className="text-xs text-muted-foreground">
                I agree to the{" "}
                <Link href="#" className="text-primary hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="#" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
              </span>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all opacity-0 animate-fade-in-up"
              style={{ animationDelay: "1800ms" }}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Creating account...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  Start My Journey!
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </Button>
          </form>

          {/* Login link */}
          <p
            className="text-center text-sm text-muted-foreground mt-6 opacity-0 animate-fade-in-up"
            style={{ animationDelay: "1900ms" }}
          >
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              Log In 👋
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
