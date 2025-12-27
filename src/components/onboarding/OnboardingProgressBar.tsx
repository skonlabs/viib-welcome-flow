import { motion } from "framer-motion";

interface OnboardingProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

const STEP_LABELS = [
  "Welcome",      // 1: welcome
  "Sign Up",      // 2: entry
  "Sign Up",      // 3: phone
  "Verify",       // 4: otp
  "Sign Up",      // 5: email
  "Verify",       // 6: email-otp
  "Security",     // 7: biometric
  "Profile",      // 8: identity
  "Platforms",    // 9: platforms
  "Languages",    // 10: languages
  "Mood",         // 11: mood
  "Taste",        // 12: taste
  "Complete"      // 13: completion
];

export const OnboardingProgressBar = ({ currentStep, totalSteps }: OnboardingProgressBarProps) => {
  const progress = (currentStep / totalSteps) * 100;
  const stepLabel = STEP_LABELS[currentStep - 1] || `Step ${currentStep}`;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 px-4 py-3 bg-black/50 backdrop-blur-md">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">
            {stepLabel}
          </span>
          <span className="text-xs text-muted-foreground">
            {currentStep} of {totalSteps}
          </span>
        </div>
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  );
};
