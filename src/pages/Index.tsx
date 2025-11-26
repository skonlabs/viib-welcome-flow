import { Button } from "@/components/ui/button";
import { Apple, PlayCircle, Users, Heart, Sparkles, ArrowRight, Star } from "lucide-react";
import LandingHeader from "@/components/LandingHeader";
import { motion, useScroll, useTransform } from "framer-motion";

const Index = () => {
  const { scrollYProgress } = useScroll();
  
  // Parallax transforms for different orbs
  const orb1Y = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const orb2Y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const particlesY = useTransform(scrollYProgress, [0, 1], [0, -100]);
  return (
    <div className="min-h-screen bg-black overflow-hidden relative">
      <LandingHeader />

      {/* Background container with overflow hidden - spans entire page */}
      <div className="fixed inset-0 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 gradient-ocean opacity-40" />
          <motion.div
            className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[80px] opacity-40"
            style={{
              background: "radial-gradient(circle, #a855f7 0%, transparent 70%)",
              y: orb1Y
            }}
            animate={{
              x: [0, 100, 0],
              y: [0, -50, 0]
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-[80px] opacity-30"
            style={{
              background: "radial-gradient(circle, #0ea5e9 0%, transparent 70%)",
              y: orb2Y
            }}
            animate={{
              x: [0, -80, 0],
              y: [0, 40, 0]
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>
      </div>

      {/* Floating Particles - spans entire page */}
      <motion.div 
        className="fixed inset-0 overflow-hidden pointer-events-none"
        style={{ y: particlesY }}
      >
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 2
            }}
          />
        ))}
      </motion.div>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 pt-32 pb-20">
        <div className="container mx-auto max-w-7xl relative z-10">
          <div className="text-center space-y-12">
            {/* Main Headline */}
            <div className="space-y-8 animate-fade-in">
              <div className="inline-block">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 text-sm text-muted-foreground mb-6">
                  <Star className="h-4 w-4 text-primary" />
                  <span>Trusted by 50,000+ users worldwide</span>
                </div>
              </div>

              <h1 className="text-5xl md:text-7xl lg:text-8xl font-black leading-[1.1] tracking-tight">
                <span className="block">Your Next Favorite</span>
                <span className="block bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  Is Already Here
                </span>
              </h1>

              <p className="text-lg md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Personalized entertainment recommendations powered by your social circle and emotional intelligence
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4 animate-fade-in [animation-delay:300ms]">
              <a href="/onboarding">
                <Button
                  size="lg"
                  className="group text-lg px-10 py-7 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-[0_20px_50px_-15px_rgba(168,85,247,0.4)] transition-all duration-300"
                >
                  <Apple className="mr-2 h-6 w-6" />
                  <span>Run on iOS</span>
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </a>

              <a href="/onboarding">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg px-10 py-7 bg-background/10 backdrop-blur-xl border border-white/10 hover:border-primary/30 hover:bg-background/20 transition-all duration-300"
                >
                  <PlayCircle className="mr-2 h-6 w-6" />
                  <span>Run on Android</span>
                </Button>
              </a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto pt-16 animate-fade-in [animation-delay:600ms]">
              <div className="space-y-2">
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  50K+
                </div>
                <div className="text-xs md:text-sm text-muted-foreground">Active Users</div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
                  1M+
                </div>
                <div className="text-xs md:text-sm text-muted-foreground">Recommendations</div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">
                  4.8★
                </div>
                <div className="text-xs md:text-sm text-muted-foreground">App Rating</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-32 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-4xl md:text-6xl font-black">
              <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                Engineered for Discovery
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Advanced algorithms meet human connection
            </p>
          </div>

          {/* Feature Grid */}
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {/* Feature 1 */}
            <div className="group relative animate-fade-in">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent blur-xl group-hover:blur-2xl transition-all" />
              <div className="relative h-full p-8 backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl hover:border-primary/20 transition-all duration-300">
                <div className="space-y-6">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
                    <Users className="h-7 w-7 text-primary" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-2xl font-bold">Social Intelligence</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Discover through trusted recommendations from your inner circle
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="group relative animate-fade-in [animation-delay:200ms]">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent blur-xl group-hover:blur-2xl transition-all" />
              <div className="relative h-full p-8 backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl hover:border-accent/20 transition-all duration-300">
                <div className="space-y-6">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center border border-accent/20">
                    <Heart className="h-7 w-7 text-accent" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-2xl font-bold">Mood Matching</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      AI that understands your emotional state and finds the perfect fit
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="group relative animate-fade-in [animation-delay:400ms]">
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-transparent blur-xl group-hover:blur-2xl transition-all" />
              <div className="relative h-full p-8 backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl hover:border-secondary/20 transition-all duration-300">
                <div className="space-y-6">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-secondary/20 to-secondary/5 flex items-center justify-center border border-secondary/20">
                    <Sparkles className="h-7 w-7 text-secondary" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-2xl font-bold">Smart Curation</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Constantly learning from your viewing patterns and preferences
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="contact" className="relative py-32 px-4">
        <div className="container mx-auto max-w-4xl relative z-10">
          <div className="backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-3xl p-12 md:p-16 text-center space-y-8">
            <h2 className="text-4xl md:text-6xl font-black">
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Start Discovering Today
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join thousands who've already found their perfect watch
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <a href="/onboarding">
                <Button
                  size="lg"
                  className="group text-lg px-10 py-7 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-[0_20px_50px_-15px_rgba(168,85,247,0.4)] transition-all duration-300"
                >
                  <Apple className="mr-2 h-6 w-6" />
                  <span>Download Now</span>
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </a>

              <a href="/onboarding">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg px-10 py-7 bg-background/10 backdrop-blur-xl border border-white/10 hover:border-primary/30 hover:bg-background/20 transition-all duration-300"
                >
                  <PlayCircle className="mr-2 h-6 w-6" />
                  <span>Get on Android</span>
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/5 py-12 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-sm text-muted-foreground">
              © 2025 ViiB. All rights reserved.
            </div>
            <div className="flex gap-8 text-sm">
              <a href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                Privacy
              </a>
              <a href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                Terms
              </a>
              <a href="mailto:skonlabs@gmail.com" className="text-muted-foreground hover:text-foreground transition-colors">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
