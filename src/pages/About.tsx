import { Button } from "@/components/ui/button";
import { ArrowLeft, Target, Users, Lightbulb, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const About = () => {
  return (
    <div className="min-h-screen bg-black text-foreground">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 gradient-ocean opacity-30" />
        <motion.div
          className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full blur-[100px]"
          style={{
            background: "radial-gradient(circle, #a855f7 0%, transparent 70%)"
          }}
          animate={{
            x: [0, 50, 0],
            y: [0, -30, 0]
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-white/5 backdrop-blur-xl">
          <div className="container mx-auto px-4 lg:px-8 py-6">
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 lg:px-8 py-16 max-w-6xl">
          <div className="space-y-20">
            {/* Hero Section */}
            <div className="text-center space-y-6 max-w-4xl mx-auto">
              <motion.h1 
                className="text-5xl md:text-7xl font-bold"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  About ViiB
                </span>
              </motion.h1>
              <motion.p 
                className="text-xl md:text-2xl text-muted-foreground leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                We're building the future of entertainment discovery—where emotion meets technology, 
                and your perfect watch is always just a tap away.
              </motion.p>
            </div>

            {/* Mission Section */}
            <section className="space-y-12">
              <div className="text-center space-y-4">
                <h2 className="text-4xl font-bold">
                  <span className="text-gradient">Our Mission</span>
                </h2>
                <div className="h-1 w-24 bg-gradient-to-r from-primary to-secondary mx-auto rounded-full" />
              </div>
              
              <div className="grid md:grid-cols-3 gap-8">
                <motion.div 
                  className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                >
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
                    <Target className="h-7 w-7 text-primary" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-2xl font-bold">Precision</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Deliver perfectly matched content recommendations by understanding your unique emotional state 
                      and viewing preferences.
                    </p>
                  </div>
                </motion.div>

                <motion.div 
                  className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                >
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-secondary/20 to-secondary/5 flex items-center justify-center border border-secondary/20">
                    <Users className="h-7 w-7 text-secondary" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-2xl font-bold">Connection</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Foster meaningful connections through shared entertainment experiences with trusted friends 
                      and family.
                    </p>
                  </div>
                </motion.div>

                <motion.div 
                  className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center border border-accent/20">
                    <Lightbulb className="h-7 w-7 text-accent" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-2xl font-bold">Innovation</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Push boundaries with AI-powered emotional intelligence that evolves with you and learns from 
                      every interaction.
                    </p>
                  </div>
                </motion.div>
              </div>
            </section>

            {/* Vision Section */}
            <section className="space-y-8">
              <div className="text-center space-y-4">
                <h2 className="text-4xl font-bold">
                  <span className="text-gradient">Our Vision</span>
                </h2>
                <div className="h-1 w-24 bg-gradient-to-r from-secondary to-accent mx-auto rounded-full" />
              </div>
              
              <motion.div 
                className="max-w-4xl mx-auto backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-3xl p-12 space-y-6"
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                <p className="text-xl text-muted-foreground leading-relaxed">
                  We envision a world where finding your next favorite show or movie is effortless and deeply personal. 
                  Where technology understands not just what you watch, but how you feel—and delivers experiences that 
                  resonate with your emotional state and social connections.
                </p>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Through advanced AI and emotional intelligence, we're creating a recommendation engine that goes beyond 
                  algorithms—it's your personal entertainment companion that truly knows you.
                </p>
              </motion.div>
            </section>

            {/* Values Section */}
            <section className="space-y-8">
              <div className="text-center space-y-4">
                <h2 className="text-4xl font-bold">
                  <span className="text-gradient">Our Values</span>
                </h2>
                <div className="h-1 w-24 bg-gradient-to-r from-accent to-primary mx-auto rounded-full" />
              </div>
              
              <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                <motion.div 
                  className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 space-y-3"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                >
                  <div className="flex items-center gap-3">
                    <Heart className="h-6 w-6 text-primary" />
                    <h3 className="text-xl font-bold">Privacy First</h3>
                  </div>
                  <p className="text-muted-foreground">
                    Your data stays yours. We never sell your information or compromise your privacy.
                  </p>
                </motion.div>

                <motion.div 
                  className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 space-y-3"
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                >
                  <div className="flex items-center gap-3">
                    <Lightbulb className="h-6 w-6 text-secondary" />
                    <h3 className="text-xl font-bold">User-Centric Design</h3>
                  </div>
                  <p className="text-muted-foreground">
                    Every feature is designed with you in mind, focusing on intuitive experiences.
                  </p>
                </motion.div>

                <motion.div 
                  className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 space-y-3"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                >
                  <div className="flex items-center gap-3">
                    <Users className="h-6 w-6 text-accent" />
                    <h3 className="text-xl font-bold">Community Driven</h3>
                  </div>
                  <p className="text-muted-foreground">
                    Built with and for our community, incorporating feedback at every step.
                  </p>
                </motion.div>

                <motion.div 
                  className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 space-y-3"
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                >
                  <div className="flex items-center gap-3">
                    <Target className="h-6 w-6 text-primary" />
                    <h3 className="text-xl font-bold">Continuous Improvement</h3>
                  </div>
                  <p className="text-muted-foreground">
                    We constantly evolve, learning from data and user experiences to get better.
                  </p>
                </motion.div>
              </div>
            </section>

            {/* CTA Section */}
            <motion.section 
              className="text-center space-y-8 py-12"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-4xl font-bold">
                <span className="text-gradient">
                  Join Us on This Journey
                </span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Be part of the revolution in entertainment discovery
              </p>
              <Link to="/app/onboarding">
                <Button
                  size="2xl"
                  variant="gradient"
                  className="shadow-[0_20px_50px_-15px_rgba(168,85,247,0.4)]"
                >
                  Get Started Today
                </Button>
              </Link>
            </motion.section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default About;
