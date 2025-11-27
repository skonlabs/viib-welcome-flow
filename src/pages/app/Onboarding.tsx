import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { WelcomeScreen } from "@/components/onboarding/WelcomeScreen";
import { EntryMethodScreen } from "@/components/onboarding/EntryMethodScreen";
import { PhoneEntryScreen } from "@/components/onboarding/PhoneEntryScreen";
import { OTPVerificationScreen } from "@/components/onboarding/OTPVerificationScreen";
import { EmailSignupScreen } from "@/components/onboarding/EmailSignupScreen";
import { EmailOTPVerificationScreen } from "@/components/onboarding/EmailOTPVerificationScreen";
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
import { useNavigate, useParams } from "react-router-dom";

type OnboardingStep =
  | "welcome"
  | "entry"
  | "phone"
  | "otp"
  | "email"
  | "email-otp"
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
  const { step } = useParams<{ step: string }>();
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

  // Sync URL with current step
  useEffect(() => {
    if (!step) {
      // If no step in URL, redirect to welcome
      navigate('/app/onboarding/welcome', { replace: true });
    } else if (step !== currentStep) {
      const validSteps: OnboardingStep[] = [
        "welcome", "entry", "phone", "otp", "email", "email-otp", "biometric", "identity",
        "platforms", "languages", "mood", "taste", "dna", "social",
        "recommendations", "feedback", "companion", "completion"
      ];
      if (validSteps.includes(step as OnboardingStep)) {
        setCurrentStep(step as OnboardingStep);
      } else {
        // Invalid step, redirect to welcome
        navigate('/app/onboarding/welcome', { replace: true });
      }
    }
  }, [step, currentStep, navigate]);

  // Update URL when step changes
  const navigateToStep = (newStep: OnboardingStep) => {
    setCurrentStep(newStep);
    navigate(`/app/onboarding/${newStep}`);
  };

  const handleWelcomeContinue = () => {
    navigateToStep("entry");
  };

  const handleEntryMethod = (method: string) => {
    setOnboardingData((prev) => ({ ...prev, entryMethod: method }));
    if (method === "phone") {
      navigateToStep("phone");
    } else if (method === "email") {
      navigateToStep("email");
    } else {
      // Apple sign in - skip to biometric
      navigateToStep("biometric");
    }
  };

  const handlePhoneEntry = (phone: string, countryCode: string) => {
    setOnboardingData((prev) => ({ ...prev, phone, countryCode }));
    navigateToStep("otp");
  };

  const handleOTPVerify = async (otp: string) => {
    console.log("OTP verified:", otp);
    
    const fullPhone = `${onboardingData.countryCode}${onboardingData.phone}`;
    
    // Check if user already exists with this phone number
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, onboarding_completed, is_phone_verified')
      .eq('phone_number', fullPhone)
      .maybeSingle();
    
    if (checkError) {
      console.error('Error checking existing user:', checkError);
    }
    
    // If user exists with verified phone, they're resuming onboarding
    if (existingUser && existingUser.is_phone_verified) {
      console.log('User exists, resuming onboarding');
      localStorage.setItem('viib_user_id', existingUser.id);
      localStorage.setItem('viib_resume_onboarding', 'true');
      navigateToStep("biometric");
      return;
    }
    
    // New user - create user record in database AFTER successful verification
    try {
      const { data: insertedUser, error } = await supabase
        .from('users')
        .insert({
          phone_number: fullPhone,
          signup_method: 'phone',
          is_phone_verified: true,
          is_age_over_18: true,
          onboarding_completed: false,
          is_active: false,
        })
        .select()
        .single();
      
      if (error && error.code !== '23505') {
        console.error('Error creating user record:', error);
        throw error;
      }

      if (insertedUser) {
        console.log('User record created successfully:', insertedUser.id);
        localStorage.setItem('viib_user_id', insertedUser.id);
      }
    } catch (error) {
      console.error('Error in handleOTPVerify:', error);
      throw error;
    }
    
    navigateToStep("biometric");
  };

  const handleEmailOTPVerify = async () => {
    // User creation is now handled by verify-email-otp edge function
    navigateToStep("biometric");
  };

  const handleEmailSignup = async (email: string, password: string) => {
    setOnboardingData((prev) => ({ ...prev, email, password }));
    navigateToStep("email-otp");
  };

  const handleResendEmailOTP = async () => {
    const { error } = await supabase.functions.invoke("send-email-otp", {
      body: { email: onboardingData.email },
    });
    if (error) {
      console.error("Error resending email OTP:", error);
      throw error;
    }
  };

  const handleBiometric = (enabled: boolean) => {
    navigateToStep("identity");
  };

  const handleIdentity = (data: { name: string; vibe: string }) => {
    setOnboardingData((prev) => ({ ...prev, ...data }));
    navigateToStep("platforms");
  };

  const handlePlatforms = (platforms: string[]) => {
    setOnboardingData((prev) => ({ ...prev, platforms }));
    navigateToStep("languages");
  };

  const handleLanguages = (languages: string[]) => {
    setOnboardingData((prev) => ({ ...prev, languages }));
    navigateToStep("mood");
  };

  const handleMood = (mood: { energy: number; positivity: number }) => {
    setOnboardingData((prev) => ({ ...prev, mood }));
    navigateToStep("taste");
  };

  const handleTaste = (visualTaste: string[]) => {
    setOnboardingData((prev) => ({ ...prev, visualTaste }));
    navigateToStep("dna");
  };

  const handleDNAContinue = () => {
    navigateToStep("social");
  };

  const handleSocial = () => {
    navigateToStep("recommendations");
  };

  const handleRecommendations = () => {
    navigateToStep("feedback");
  };

  const handleFeedback = (feedback: string) => {
    setOnboardingData((prev) => ({ ...prev, feedback }));
    navigateToStep("companion");
  };

  const handleCompanion = () => {
    navigateToStep("completion");
  };

  const handleComplete = async () => {
    console.log("Onboarding completed with data:", onboardingData);
    
    try {
      // Check if we have a stored user_id from resume scenario
      const storedUserId = localStorage.getItem('viib_user_id');
      
      if (!storedUserId) {
        console.error('No user ID found in localStorage');
        return;
      }
      
      // Update user record
      const { error } = await supabase
        .from('users')
        .update({
          onboarding_completed: true,
          is_active: true,
          full_name: onboardingData.name,
        })
        .eq('id', storedUserId);
      
      if (error) {
        console.error('Error updating user record:', error);
        throw error;
      }
      
      console.log('Successfully updated onboarding_completed and is_active');
      
      // Clean up resume flag
      localStorage.removeItem('viib_resume_onboarding');
      
      // Wait a moment to ensure database update completes
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Navigate to app root which will redirect to home
      navigate("/app");
    } catch (error) {
      console.error('Error in handleComplete:', error);
    }
  };

  // Back navigation handlers
  const handleBackToWelcome = () => navigateToStep("welcome");
  const handleBackToEntry = () => navigateToStep("entry");
  const handleBackToBiometric = () => {
    // Go back to the authentication screen they came from
    if (onboardingData.entryMethod === "phone") {
      navigateToStep("otp");
    } else if (onboardingData.entryMethod === "email") {
      navigateToStep("email-otp");
    } else {
      navigateToStep("entry");
    }
  };
  const handleBackToEmail = () => navigateToStep("email");
  const handleBackToIdentity = () => navigateToStep("identity");
  const handleBackToPlatforms = () => navigateToStep("platforms");
  const handleBackToLanguages = () => navigateToStep("languages");
  const handleBackToMood = () => navigateToStep("mood");
  const handleBackToTaste = () => navigateToStep("taste");
  const handleBackToDNA = () => navigateToStep("dna");
  const handleBackToSocial = () => navigateToStep("social");
  const handleBackToRecommendations = () => navigateToStep("recommendations");
  const handleBackToFeedback = () => navigateToStep("feedback");

  return (
    <div className="min-h-screen bg-black">
      {currentStep === "welcome" && (
        <WelcomeScreen onContinue={handleWelcomeContinue} />
      )}
      {currentStep === "entry" && (
        <EntryMethodScreen onSelectMethod={handleEntryMethod} onBack={handleBackToWelcome} />
      )}
      {currentStep === "phone" && (
        <PhoneEntryScreen
          onContinue={handlePhoneEntry}
          onBack={handleBackToEntry}
        />
      )}
      {currentStep === "otp" && (
        <OTPVerificationScreen
          phone={`${onboardingData.countryCode} ${onboardingData.phone}`}
          onContinue={handleOTPVerify}
          onResend={() => console.log("Resend OTP")}
          onChangeNumber={() => navigateToStep("phone")}
        />
      )}
      {currentStep === "email" && (
        <EmailSignupScreen
          onContinue={handleEmailSignup}
          onBack={handleBackToEntry}
        />
      )}
      {currentStep === "email-otp" && (
        <EmailOTPVerificationScreen
          email={onboardingData.email}
          password={onboardingData.password}
          onContinue={handleEmailOTPVerify}
          onBack={handleBackToEmail}
        />
      )}
      {currentStep === "biometric" && (
        <BiometricEnableScreen
          onEnable={() => handleBiometric(true)}
          onSkip={() => handleBiometric(false)}
          onBack={handleBackToBiometric}
        />
      )}
      {currentStep === "identity" && (
        <UserIdentityScreen onContinue={handleIdentity} onBack={handleBackToBiometric} />
      )}
      {currentStep === "platforms" && (
        <StreamingPlatformsScreen onContinue={handlePlatforms} onBack={handleBackToIdentity} />
      )}
      {currentStep === "languages" && (
        <LanguageSelectionScreen onContinue={handleLanguages} onBack={handleBackToPlatforms} />
      )}
      {currentStep === "mood" && (
        <MoodCalibrationScreen onContinue={handleMood} onBack={handleBackToLanguages} />
      )}
      {currentStep === "taste" && (
        <VisualTasteScreen onContinue={handleTaste} onBack={handleBackToMood} />
      )}
      {currentStep === "dna" && (
        <VisualDNARevealScreen
          selections={onboardingData.visualTaste}
          onContinue={handleDNAContinue}
          onBack={handleBackToTaste}
        />
      )}
      {currentStep === "social" && (
        <SocialConnectionScreen
          onInvite={handleSocial}
          onSkip={handleSocial}
          onBack={handleBackToDNA}
        />
      )}
      {currentStep === "recommendations" && (
        <RecommendationRevealScreen
          userName={onboardingData.name}
          onContinue={handleRecommendations}
          onBack={handleBackToSocial}
        />
      )}
      {currentStep === "feedback" && (
        <FeedbackCaptureScreen onContinue={handleFeedback} onBack={handleBackToRecommendations} />
      )}
      {currentStep === "companion" && (
        <CompanionIntroScreen onContinue={handleCompanion} onBack={handleBackToFeedback} />
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
