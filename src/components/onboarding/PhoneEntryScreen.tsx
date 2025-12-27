import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { ArrowRight, Lock, AlertCircle } from "@/icons";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BackButton } from "./BackButton";
import { FloatingParticles } from "./FloatingParticles";
import { logger } from "@/lib/services/LoggerService";

interface EnabledCountry {
  country_code: string;
  country_name: string;
  dial_code: string;
  flag_emoji: string | null;
}

interface PhoneEntryScreenProps {
  onContinue: (phone: string, countryCode: string) => void;
  onBack: () => void;
}

export const PhoneEntryScreen = ({
  onContinue,
  onBack
}: PhoneEntryScreenProps) => {
  const [countryCode, setCountryCode] = useState("+1");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState<EnabledCountry[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);

  useEffect(() => {
    const loadCountries = async () => {
      try {
        const { data, error } = await supabase
          .from('enabled_countries')
          .select('country_code, country_name, dial_code, flag_emoji')
          .eq('is_active', true)
          .order('country_name');

        if (error) throw error;
        
        if (data && data.length > 0) {
          setCountries(data);
          // Set default to US if available, otherwise first country
          const usCountry = data.find(c => c.country_code === 'US');
          if (usCountry) {
            setCountryCode(usCountry.dial_code);
          } else {
            setCountryCode(data[0].dial_code);
          }
        } else {
          // Fallback if no countries in DB
          setCountries([
            { country_code: 'US', country_name: 'United States', dial_code: '+1', flag_emoji: '🇺🇸' },
            { country_code: 'GB', country_name: 'United Kingdom', dial_code: '+44', flag_emoji: '🇬🇧' },
            { country_code: 'IN', country_name: 'India', dial_code: '+91', flag_emoji: '🇮🇳' },
          ]);
        }
      } catch (err) {
        logger.error(err, { operation: 'load_enabled_countries' });
        // Fallback countries
        setCountries([
          { country_code: 'US', country_name: 'United States', dial_code: '+1', flag_emoji: '🇺🇸' },
          { country_code: 'GB', country_name: 'United Kingdom', dial_code: '+44', flag_emoji: '🇬🇧' },
          { country_code: 'IN', country_name: 'India', dial_code: '+91', flag_emoji: '🇮🇳' },
        ]);
      } finally {
        setLoadingCountries(false);
      }
    };

    loadCountries();
  }, []);

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const handleContinue = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setError("Please enter a valid phone number");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const fullPhone = `${countryCode}${digits}`;
      
      // Check if phone number already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id, phone_number, is_phone_verified, onboarding_completed')
        .eq('phone_number', fullPhone)
        .maybeSingle();

      if (checkError) {
        await logger.error(checkError, {
          operation: 'phone_signup_check_existing',
        });
        setError("Unable to verify phone number. Please try again.");
        return;
      }

      if (existingUser) {
        // If phone verified and onboarding complete, they should use login
        if (existingUser.is_phone_verified && existingUser.onboarding_completed) {
          setError("This phone number is already registered. Please sign in instead.");
          return;
        }
        
        // SECURITY: Always require OTP verification, even for incomplete onboarding
      }

      const { error } = await supabase.functions.invoke("send-phone-otp", {
        body: { phoneNumber: fullPhone }
      });
      if (error) {
        await logger.error(error, { operation: 'send_phone_otp' });
        setError("Unable to send verification code. Please try again.");
        return;
      }
      onContinue(digits, countryCode);
    } catch (err) {
      await logger.error(err, { operation: 'phone_signup_process' });
      setError("Unable to send verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 pt-16 relative overflow-hidden bg-black">
      <BackButton onClick={onBack} />
      
      {/* Background container - fixed positioning */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 gradient-ocean opacity-40" />
          <motion.div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[80px] opacity-40" style={{
            background: "radial-gradient(circle, #a855f7 0%, transparent 70%)"
          }} animate={{
            x: [0, 100, 0],
            y: [0, -50, 0]
          }} transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }} />
          <motion.div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-[80px] opacity-30" style={{
            background: "radial-gradient(circle, #0ea5e9 0%, transparent 70%)"
          }} animate={{
            x: [0, -80, 0],
            y: [0, 40, 0]
          }} transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut"
          }} />
        </div>
      </div>

      {/* Floating Particles */}
      <FloatingParticles />

      {/* Content */}
      <motion.div className="relative z-10 w-full max-w-md" initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.6
      }}>
        <div className="space-y-8">
          {/* Header */}
          <motion.div className="text-center space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border border-primary/30 mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-4xl font-bold">
              <span className="text-gradient">Create your account</span>
            </h2>
            <p className="text-muted-foreground">
              We'll send you a verification code
            </p>
          </motion.div>

          {/* Form */}
          <motion.div className="glass-card rounded-3xl p-8 space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <div className="space-y-4">
              <label className="text-sm text-muted-foreground">
                Phone Number
              </label>
              <div className="flex gap-3">
                <Select value={countryCode} onValueChange={setCountryCode} disabled={loadingCountries}>
                  <SelectTrigger className="w-28 h-14 bg-white/5 border-white/10">
                    <SelectValue placeholder="..." />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country.country_code} value={country.dial_code}>
                        {country.flag_emoji} {country.dial_code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input 
                  type="tel" 
                  value={formatPhoneNumber(phone)} 
                  onChange={e => {
                    const digits = e.target.value.replace(/\D/g, "");
                    setPhone(digits.slice(0, 10));
                    setError("");
                  }} 
                  placeholder="(555) 123-4567" 
                  className="flex-1 h-14 text-lg bg-white/5 border-white/10 focus:border-primary/50 focus:bg-white/10" 
                />
              </div>
              {error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-sm text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </motion.div>
              )}
            </div>

            <div className="pt-4 space-y-4">
              <Button onClick={handleContinue} size="2xl" variant="gradient" className="w-full shadow-[0_20px_50px_-15px_rgba(168,85,247,0.4)]" disabled={loading || loadingCountries} loading={loading}>
                Send Code
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <button onClick={onBack} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors">
                Use a different method
              </button>
              <p className="text-sm text-center text-muted-foreground">
                Already have an account?{" "}
                <button
                  onClick={() => window.location.href = "/login?tab=phone"}
                  className="text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  Sign In
                </button>
              </p>
            </div>
          </motion.div>

          {/* Privacy Note */}
          <motion.p className="text-xs text-center text-muted-foreground/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
            🔒 No spam. No marketing. Authentication only.
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
};
