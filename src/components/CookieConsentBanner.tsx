import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const COOKIE_CONSENT_KEY = "viib_cookie_consent";

export const CookieConsentBanner = () => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has already consented
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Small delay before showing banner
      const timer = setTimeout(() => setShowBanner(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
      essential: true,
      analytics: true,
      marketing: false,
      timestamp: new Date().toISOString()
    }));
    setShowBanner(false);
  };

  const handleAcceptEssential = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
      essential: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString()
    }));
    setShowBanner(false);
  };

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-[100] p-4"
        >
          <div className="max-w-4xl mx-auto">
            <div className="bg-card/95 backdrop-blur-lg border border-border rounded-2xl shadow-2xl p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">🍪 We value your privacy</h3>
                  <p className="text-sm text-muted-foreground">
                    We use cookies to enhance your experience and analyze usage. By clicking "Accept All", you consent to our use of cookies.{" "}
                    <a href="/privacy" className="text-primary hover:underline">
                      Learn more
                    </a>
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAcceptEssential}
                    className="whitespace-nowrap"
                  >
                    Essential Only
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAcceptAll}
                    className="whitespace-nowrap bg-primary hover:bg-primary/90"
                  >
                    Accept All
                  </Button>
                  <button
                    onClick={handleAcceptEssential}
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
