import { Button } from "@/components/ui/button";
import { Apple, Menu } from "lucide-react";
import { useState } from "react";
import viibLogoNew from "@/assets/viib-logo-new.png";

const LandingHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-transparent border-b border-white/5">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-24">
          {/* Logo */}
          <a href="/" className="flex items-center gap-3 group">
            <img
              src={viibLogoNew}
              alt="ViiB"
              className="h-20 w-auto transition-transform group-hover:scale-105 drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]"
            />
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              About
            </a>
            <a href="#contact" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Contact
            </a>
          </nav>

          {/* CTA Button */}
          <div className="hidden md:block">
            <a href="/onboarding">
              <Button
                size="sm"
                className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-lg"
              >
                <Apple className="mr-2 h-4 w-4" />
                Get Started
              </Button>
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 space-y-4">
            <a href="#features" className="block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#about" className="block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              About
            </a>
            <a href="#contact" className="block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Contact
            </a>
            <a href="/onboarding">
              <Button
                size="sm"
                className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
              >
                <Apple className="mr-2 h-4 w-4" />
                Get Started
              </Button>
            </a>
          </div>
        )}
      </div>
    </header>
  );
};

export default LandingHeader;
