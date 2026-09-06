import { Navbar } from "@/components/navbar";
import { ScrollStory } from "@/components/scroll-story";
import { HowItWorks, Features, Research, Testimonials, CTA } from "@/components/sections";
import { Footer } from "@/components/footer";
import { JumbleLetters } from "@/components/jumble-letters";
import { CustomCursor } from "@/components/mentis/custom-cursor";
import { GrainOverlay } from "@/components/mentis/grain-overlay";

export default function Home() {
  return (
    <main className="min-h-screen bg-background relative">
      {/* UI polish only: reticle cursor + film grain (no content added) */}
      <CustomCursor />
      <GrainOverlay />

      {/* Animated Background Letters */}
      <JumbleLetters />

      <Navbar />

      {/* Hero - Scroll-Driven Story */}
      <ScrollStory />
      
      {/* How It Works Section */}
      <HowItWorks />
      
      {/* Features Section */}
      <Features />
      
      {/* Research Section */}
      <Research />
      
      {/* Testimonials Section */}
      <Testimonials />
      
      {/* Call to Action */}
      <CTA />
      
      {/* Footer */}
      <Footer />
    </main>
  );
}
