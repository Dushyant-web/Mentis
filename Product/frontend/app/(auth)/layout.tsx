import { JumbleLetters } from "@/components/jumble-letters";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-secondary/30 to-accent/10" />
      
      {/* Floating shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 rounded-full bg-primary/5 blur-3xl -top-20 -left-20 animate-gentle-float" />
        <div className="absolute w-72 h-72 rounded-full bg-accent/10 blur-2xl bottom-10 right-10 animate-gentle-float"
          style={{ animationDelay: "2s" }} />
        <div className="absolute w-56 h-56 rounded-full bg-primary/8 blur-2xl top-1/2 right-1/4 animate-gentle-float"
          style={{ animationDelay: "4s" }} />
      </div>

      {/* Jumble Letters overlay (lighter for auth) */}
      <div className="opacity-30">
        <JumbleLetters />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        {children}
      </div>
    </div>
  );
}
