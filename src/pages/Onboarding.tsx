import { useState } from "react";
import { WelcomeScreen } from "@/components/onboarding/WelcomeScreen";
import { EntryMethodScreen } from "@/components/onboarding/EntryMethodScreen";
import { PhoneEntryScreen } from "@/components/onboarding/PhoneEntryScreen";
import { OTPVerificationScreen } from "@/components/onboarding/OTPVerificationScreen";
import { EmailSignupScreen } from "@/components/onboarding/EmailSignupScreen";
import { BiometricEnableScreen } from "@/components/onboarding/BiometricEnableScreen";
import { UserIdentityScreen } from "@/components/onboarding/UserIdentityScreen";
import { StreamingPlatformsScreen } from "@/components/onboarding/StreamingPlatformsScreen";
import { LanguageSelectionScreen } from "@/components/onboarding/LanguageSelectionScreen";
import { MoodCalibrationScreen } from "@/components/onboarding/MoodCalibrationScreen";
import { VisualTasteScreen } from "@/components/onboarding/VisualTasteScreen";
import { VisualDNARevealScreen } from "@/components/onboarding/VisualDNARevealScreen";
import { SocialConnectionScreen } from "@/components/onboarding/SocialConnectionScreen";
import { RecommendationRevealScreen } from "@/components/onboarding/RecommendationRevealScreen";
import { FeedbackCaptureScreen } from "@/components/onboarding/FeedbackCaptureScreen";
import { CompanionIntroScreen } from "@/components/onboarding/CompanionIntroScreen";
import { CompletionScreen } from "@/components/onboarding/CompletionScreen";
import { useNavigate } from "react-router-dom";

type OnboardingStep =
  | "welcome"
  | "entry"
  | "phone"
  | "otp"
  | "email"
  | "biometric"
  | "identity"
  | "platforms"
  | "languages"
  | "mood"
  | "taste"
  | "dna"
  | "social"
  | "recommendations"
  | "feedback"
  | "companion"
  | "completion";

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("welcome");
  const [onboardingData, setOnboardingData] = useState({
    entryMethod: "",
    phone: "",
    countryCode: "",
    email: "",
    password: "",
    name: "",
    vibe: "",
    platforms: [] as string[],
    languages: [] as string[],
    mood: { energy: 50, positivity: 50 },
    visualTaste: [] as string[],
    feedback: "",
  });
  const navigate = useNavigate();

  const handleWelcomeContinue = () => {
    setCurrentStep("entry");
  };

  const handleEntryMethod = (method: string) => {
    setOnboardingData((prev) => ({ ...prev, entryMethod: method }));
    if (method === "phone") {
      setCurrentStep("phone");
    } else if (method === "email") {
      setCurrentStep("email");
    } else {
      // Apple sign in - skip to biometric
      setCurrentStep("biometric");
    }
  };

  const handlePhoneEntry = (phone: string, countryCode: string) => {
    setOnboardingData((prev) => ({ ...prev, phone, countryCode }));
    setCurrentStep("otp");
  };

  const handleOTPVerify = (otp: string) => {
    console.log("OTP verified:", otp);
    setCurrentStep("biometric");
  };

  const handleEmailSignup = (email: string, password: string) => {
    setOnboardingData((prev) => ({ ...prev, email, password }));
    setCurrentStep("biometric");
  };

  const handleBiometric = (enabled: boolean) => {
    setCurrentStep("identity");
  };

  const handleIdentity = (data: { name: string; vibe: string }) => {
    setOnboardingData((prev) => ({ ...prev, ...data }));
    setCurrentStep("platforms");
  };

  const handlePlatforms = (platforms: string[]) => {
    setOnboardingData((prev) => ({ ...prev, platforms }));
    setCurrentStep("languages");
  };

  const handleLanguages = (languages: string[]) => {
    setOnboardingData((prev) => ({ ...prev, languages }));
    setCurrentStep("mood");
  };

  const handleMood = (mood: { energy: number; positivity: number }) => {
    setOnboardingData((prev) => ({ ...prev, mood }));
    setCurrentStep("taste");
  };

  const handleTaste = (visualTaste: string[]) => {
    setOnboardingData((prev) => ({ ...prev, visualTaste }));
    setCurrentStep("dna");
  };

  const handleDNAContinue = () => {
    setCurrentStep("social");
  };

  const handleSocial = () => {
    setCurrentStep("recommendations");
  };

  const handleRecommendations = () => {
    setCurrentStep("feedback");
  };

  const handleFeedback = (feedback: string) => {
    setOnboardingData((prev) => ({ ...prev, feedback }));
    setCurrentStep("companion");
  };

  const handleCompanion = () => {
    setCurrentStep("completion");
  };

  const handleComplete = () => {
    console.log("Onboarding completed with data:", onboardingData);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-black">
      {currentStep === "welcome" && (
        <WelcomeScreen onContinue={handleWelcomeContinue} />
      )}
      {currentStep === "entry" && (
        <EntryMethodScreen onSelectMethod={handleEntryMethod} />
      )}
      {currentStep === "phone" && (
        <PhoneEntryScreen
          onContinue={handlePhoneEntry}
          onBack={() => setCurrentStep("entry")}
        />
      )}
      {currentStep === "otp" && (
        <OTPVerificationScreen
          phone={`${onboardingData.countryCode} ${onboardingData.phone}`}
          onContinue={handleOTPVerify}
          onResend={() => console.log("Resend OTP")}
          onChangeNumber={() => setCurrentStep("phone")}
        />
      )}
      {currentStep === "email" && (
        <EmailSignupScreen
          onContinue={handleEmailSignup}
          onBack={() => setCurrentStep("entry")}
        />
      )}
      {currentStep === "biometric" && (
        <BiometricEnableScreen
          onEnable={() => handleBiometric(true)}
          onSkip={() => handleBiometric(false)}
        />
      )}
      {currentStep === "identity" && (
        <UserIdentityScreen onContinue={handleIdentity} />
      )}
      {currentStep === "platforms" && (
        <StreamingPlatformsScreen onContinue={handlePlatforms} />
      )}
      {currentStep === "languages" && (
        <LanguageSelectionScreen onContinue={handleLanguages} />
      )}
      {currentStep === "mood" && (
        <MoodCalibrationScreen onContinue={handleMood} />
      )}
      {currentStep === "taste" && (
        <VisualTasteScreen onContinue={handleTaste} />
      )}
      {currentStep === "dna" && (
        <VisualDNARevealScreen
          selections={onboardingData.visualTaste}
          onContinue={handleDNAContinue}
        />
      )}
      {currentStep === "social" && (
        <SocialConnectionScreen
          onInvite={handleSocial}
          onSkip={handleSocial}
        />
      )}
      {currentStep === "recommendations" && (
        <RecommendationRevealScreen
          userName={onboardingData.name}
          onContinue={handleRecommendations}
        />
      )}
      {currentStep === "feedback" && (
        <FeedbackCaptureScreen onContinue={handleFeedback} />
      )}
      {currentStep === "companion" && (
        <CompanionIntroScreen onContinue={handleCompanion} />
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
