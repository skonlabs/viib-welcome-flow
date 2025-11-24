import { useState } from "react";
import { WelcomeScreen } from "@/components/onboarding/WelcomeScreen";
import { EntryMethodScreen } from "@/components/onboarding/EntryMethodScreen";
import { UserIdentityScreen } from "@/components/onboarding/UserIdentityScreen";
import { StreamingPlatformsScreen } from "@/components/onboarding/StreamingPlatformsScreen";
import { MoodCalibrationScreen } from "@/components/onboarding/MoodCalibrationScreen";
import { VisualTasteScreen } from "@/components/onboarding/VisualTasteScreen";
import { CompletionScreen } from "@/components/onboarding/CompletionScreen";
import { useNavigate } from "react-router-dom";

type OnboardingStep =
  | "welcome"
  | "entry"
  | "identity"
  | "platforms"
  | "mood"
  | "taste"
  | "completion";

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("welcome");
  const [onboardingData, setOnboardingData] = useState({
    entryMethod: "",
    name: "",
    vibe: "",
    platforms: [] as string[],
    mood: { energy: 50, positivity: 50 },
    visualTaste: [] as string[],
  });
  const navigate = useNavigate();

  const handleWelcomeContinue = () => {
    setCurrentStep("entry");
  };

  const handleEntryMethod = (method: string) => {
    setOnboardingData((prev) => ({ ...prev, entryMethod: method }));
    setCurrentStep("identity");
  };

  const handleIdentity = (data: { name: string; vibe: string }) => {
    setOnboardingData((prev) => ({ ...prev, ...data }));
    setCurrentStep("platforms");
  };

  const handlePlatforms = (platforms: string[]) => {
    setOnboardingData((prev) => ({ ...prev, platforms }));
    setCurrentStep("mood");
  };

  const handleMood = (mood: { energy: number; positivity: number }) => {
    setOnboardingData((prev) => ({ ...prev, mood }));
    setCurrentStep("taste");
  };

  const handleTaste = (visualTaste: string[]) => {
    setOnboardingData((prev) => ({ ...prev, visualTaste }));
    setCurrentStep("completion");
  };

  const handleComplete = () => {
    console.log("Onboarding completed with data:", onboardingData);
    // In a real app, this would save to backend
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {currentStep === "welcome" && (
        <WelcomeScreen onContinue={handleWelcomeContinue} />
      )}
      {currentStep === "entry" && (
        <EntryMethodScreen onSelectMethod={handleEntryMethod} />
      )}
      {currentStep === "identity" && (
        <UserIdentityScreen onContinue={handleIdentity} />
      )}
      {currentStep === "platforms" && (
        <StreamingPlatformsScreen onContinue={handlePlatforms} />
      )}
      {currentStep === "mood" && (
        <MoodCalibrationScreen onContinue={handleMood} />
      )}
      {currentStep === "taste" && (
        <VisualTasteScreen onContinue={handleTaste} />
      )}
      {currentStep === "completion" && (
        <CompletionScreen
          userName={onboardingData.name}
          onComplete={handleComplete}
        />
      )}
    </div>
  );
}
