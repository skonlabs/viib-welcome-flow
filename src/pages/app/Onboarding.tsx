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
import { useNavigate, useParams, useLocation } from "react-router-dom";

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
  const [isChecking, setIsChecking] = useState(true);
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
  const location = useLocation();
  
  // Load saved onboarding data on mount
  useEffect(() => {
    const loadSavedData = async () => {
      const userId = localStorage.getItem('viib_user_id');
      if (!userId) return;
      
      try {
        // Fetch user data
        const { data: userData } = await supabase
          .from('users')
          .select('full_name, phone_number, email')
          .eq('id', userId)
          .single();
        
        // Fetch vibe preference
        const { data: vibeData } = await supabase
          .from('user_vibe_preferences')
          .select('vibe_type')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (userData) {
          // Fetch platforms - use service IDs directly
          const { data: platformsData } = await supabase
            .from('user_streaming_subscriptions')
            .select('streaming_service_id')
            .eq('user_id', userId)
            .eq('is_active', true);

          // Fetch languages
          const { data: languagesData } = await supabase
            .from('user_language_preferences')
            .select('language_code')
            .eq('user_id', userId)
            .order('priority_order');

          // Note: Mood data is loaded directly by MoodCalibrationScreen from user_emotion_states
          // No need to reverse-map here as the component handles its own restoration

          setOnboardingData(prev => ({
            ...prev,
            name: userData.full_name || '',
            vibe: vibeData?.vibe_type || '',
            phone: userData.phone_number || '',
            email: userData.email || '',
            platforms: platformsData?.map(p => p.streaming_service_id) || [],
            languages: languagesData?.map(l => l.language_code) || [],
          }));
        }
      } catch (error) {
        console.error('Error loading saved data:', error);
      }
    };
    
    loadSavedData();
  }, []);
  
  // Get data from navigation state if available
  const navPhone = location.state?.phone || onboardingData.phone;
  const navEmail = location.state?.email || onboardingData.email;
  const navPassword = location.state?.password || onboardingData.password;

  // Sync URL with current step and fetch resume point from database
  useEffect(() => {
    const checkResumePoint = async () => {
      const userId = localStorage.getItem('viib_user_id');
      
      // Check if user is logged in
      if (userId) {
        // User is logged in - check onboarding completion status
        const { data: userData } = await supabase
          .from('users')
          .select('last_onboarding_step, onboarding_completed')
          .eq('id', userId)
          .single();

        // If onboarding is already completed, redirect to home
        if (userData?.onboarding_completed) {
          navigate('/app/home', { replace: true });
          return;
        }
        
        // User has incomplete onboarding - resume from last step
        if (!step) {
          // If no step in URL, check database for resume point
          if (userData && userData.last_onboarding_step) {
            // Resume from last saved step
            navigate(userData.last_onboarding_step, { replace: true });
            return;
          }
          // Default to welcome screen
          navigate('/app/onboarding/welcome', { replace: true });
        }
      } else {
        // User is NOT logged in - show onboarding from beginning
        if (!step) {
          // Default to welcome screen for new users
          navigate('/app/onboarding/welcome', { replace: true });
          return;
        }
      }
      
      // Sync step from URL to state
      if (step && step !== currentStep) {
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
      
      // Done checking, safe to show content
      setIsChecking(false);
    };
    
    checkResumePoint();
  }, [step, currentStep, navigate]);

  // Update URL when step changes and save to database only when progressing forward
  const navigateToStep = async (newStep: OnboardingStep, shouldSaveProgress: boolean = true) => {
    setCurrentStep(newStep);
    const newUrl = `/app/onboarding/${newStep}`;
    navigate(newUrl);
    
    // Only save step to database when explicitly instructed (for forward progress)
    if (shouldSaveProgress) {
      const userId = localStorage.getItem('viib_user_id');
      if (userId) {
        await supabase
          .from('users')
          .update({ last_onboarding_step: newUrl })
          .eq('id', userId);
      }
    }
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
    const fullPhone = `${countryCode}${phone}`;
    setOnboardingData((prev) => ({ ...prev, phone: fullPhone, countryCode }));
    navigate('/app/onboarding/otp', { state: { phone: fullPhone }, replace: true });
    setCurrentStep("otp");
  };

  const handleOTPVerify = async (otp: string) => {
    // Use navPhone which comes from navigation state
    const fullPhone = navPhone;

    if (!fullPhone) {
      throw new Error("Phone number is missing. Please go back and enter your phone number again.");
    }
    
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
      
      // Mark the OTP as verified to clean up the verification record
      await supabase
        .from('phone_verifications')
        .update({ verified: true })
        .eq('phone_number', fullPhone)
        .eq('otp_code', otp)
        .eq('verified', false);
      
      navigateToStep("biometric");
      return;
    }
    
    // New user - create user record in database AFTER successful OTP verification
    try {
      // Create user immediately without waiting for IP lookup
      const { data: insertedUser, error } = await supabase
        .from('users')
        .insert({
          phone_number: fullPhone,
          signup_method: 'phone',
          is_phone_verified: true,
          is_age_over_18: true,
          onboarding_completed: false,
          is_active: false,
          ip_address: 'pending',
          ip_country: 'pending',
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

        // NOW mark the phone verification as complete in the database
        // This must happen AFTER user creation succeeds to prevent retry issues
        await supabase
          .from('phone_verifications')
          .update({ verified: true })
          .eq('phone_number', fullPhone)
          .eq('otp_code', otp)
          .eq('verified', false);

        // Fetch IP and geo data asynchronously (non-blocking)
        // This runs in the background and updates the user record when complete
        (async () => {
          try {
            const ipResponse = await fetch('https://api.ipify.org?format=json', {
              signal: AbortSignal.timeout(5000)
            });
            if (!ipResponse.ok) return;

            const ipData = await ipResponse.json();
            const ipAddress = ipData.ip;

            // Get country from IP
            let ipCountry = 'Unknown';
            try {
              const geoResponse = await fetch(`https://ipapi.co/${ipAddress}/json/`, {
                signal: AbortSignal.timeout(5000)
              });
              if (geoResponse.ok) {
                const geoData = await geoResponse.json();
                ipCountry = geoData.country_name || 'Unknown';
              }
            } catch (geoError) {
              console.error('Failed to fetch geo data:', geoError);
            }

            // Update user with IP data
            await supabase
              .from('users')
              .update({ ip_address: ipAddress, ip_country: ipCountry })
              .eq('id', insertedUser.id);

            console.log('IP/geo data updated for user:', insertedUser.id);
          } catch (ipError) {
            console.error('Failed to fetch IP data:', ipError);
          }
        })();
      }
    } catch (error) {
      console.error('Error in handleOTPVerify:', error);
      throw error;
    }
    
    navigateToStep("biometric");
  };

  const handleEmailOTPVerify = async () => {
    // User creation/resume is handled by verify-email-otp edge function
    // Check if this is a resume scenario
    const userId = localStorage.getItem('viib_user_id');
    
    if (userId) {
      // Check if user has incomplete onboarding
      const { data: userData } = await supabase
        .from('users')
        .select('onboarding_completed')
        .eq('id', userId)
        .single();
      
      if (userData && !userData.onboarding_completed) {
        localStorage.setItem('viib_resume_onboarding', 'true');
      }
    }
    
    navigateToStep("biometric");
  };

  const handleResendPhoneOTP = async () => {
    const { error } = await supabase.functions.invoke("send-phone-otp", {
      body: { phoneNumber: navPhone },
    });
    if (error) {
      console.error("Error resending phone OTP:", error);
      throw error;
    }
  };

  const handleEmailSignup = async (email: string, password: string) => {
    setOnboardingData((prev) => ({ ...prev, email, password }));
    navigate('/app/onboarding/email-otp', { state: { email, password }, replace: true });
    setCurrentStep("email-otp");
  };

  const handleResendEmailOTP = async () => {
    const { error } = await supabase.functions.invoke("send-email-otp", {
      body: { email: navEmail },
    });
    if (error) {
      console.error("Error resending email OTP:", error);
      throw error;
    }
  };

  const handleBiometric = (enabled: boolean) => {
    navigateToStep("identity");
  };

  const handleIdentity = async (data: { name: string; vibe: string }) => {
    setOnboardingData((prev) => ({ ...prev, ...data }));
    
    // Save identity data to database
    const userId = localStorage.getItem('viib_user_id');
    if (userId) {
      // Update name
      await supabase
        .from('users')
        .update({ full_name: data.name })
        .eq('id', userId);
      
      // Save vibe preference (upsert)
      await supabase
        .from('user_vibe_preferences')
        .upsert({
          user_id: userId,
          vibe_type: data.vibe
        }, {
          onConflict: 'user_id'
        });
    }
    
    navigateToStep("platforms");
  };

  const handlePlatforms = async (platforms: string[]) => {
    setOnboardingData((prev) => ({ ...prev, platforms }));
    
    // Save platforms to database - platforms are now service IDs directly
    const userId = localStorage.getItem('viib_user_id');
    if (userId && platforms.length > 0) {
      // Delete existing subscriptions
      await supabase
        .from('user_streaming_subscriptions')
        .delete()
        .eq('user_id', userId);
      
      // Insert new subscriptions - platforms are already streaming_service UUIDs
      const subscriptions = platforms.map(serviceId => ({
        user_id: userId,
        streaming_service_id: serviceId,
        is_active: true
      }));
      
      await supabase
        .from('user_streaming_subscriptions')
        .insert(subscriptions);
    }
    
    navigateToStep("languages");
  };

  const handleLanguages = async (languages: string[]) => {
    setOnboardingData((prev) => ({ ...prev, languages }));
    
    // Save languages to database
    const userId = localStorage.getItem('viib_user_id');
    if (userId && languages.length > 0) {
      // Delete existing preferences
      await supabase
        .from('user_language_preferences')
        .delete()
        .eq('user_id', userId);
      
      // Insert new preferences with priority order
      const preferences = languages.map((language_code, index) => ({
        user_id: userId,
        language_code,
        priority_order: index + 1
      }));
      
      await supabase
        .from('user_language_preferences')
        .insert(preferences);
    }
    
    navigateToStep("mood");
  };

  const handleMood = async (mood: { energy: number; positivity: number }) => {
    setOnboardingData((prev) => ({ ...prev, mood }));
    
    // MoodCalibrationScreen now handles all emotion persistence via translate_mood_to_emotion
    // No database operations needed here - just navigate to next step
    
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
      
      // Update user record with completion status
      const { error } = await supabase
        .from('users')
        .update({
          onboarding_completed: true,
          is_active: true,
        })
        .eq('id', storedUserId);
      
      if (error) {
        console.error('Error updating user record:', error);
        throw error;
      }
      
      console.log('Successfully updated onboarding_completed and is_active');
      
      // Clean up resume flag
      localStorage.removeItem('viib_resume_onboarding');
      
      // Navigate directly to home screen
      navigate("/app/home");
    } catch (error) {
      console.error('Error in handleComplete:', error);
    }
  };

  // Back navigation handlers - don't save progress when going backward
  const handleBackToWelcome = () => navigateToStep("welcome", false);
  const handleBackToEntry = () => navigateToStep("entry", false);
  const handleBackToBiometric = () => {
    // Go back to the authentication screen they came from
    if (onboardingData.entryMethod === "phone") {
      navigateToStep("otp", false);
    } else if (onboardingData.entryMethod === "email") {
      navigateToStep("email-otp", false);
    } else {
      navigateToStep("entry", false);
    }
  };
  const handleBackToEmail = () => navigateToStep("email", false);
  const handleBackToIdentity = () => navigateToStep("identity", false);
  const handleBackToPlatforms = () => navigateToStep("platforms", false);
  const handleBackToLanguages = () => navigateToStep("languages", false);
  const handleBackToMood = () => navigateToStep("mood", false);
  const handleBackToTaste = () => navigateToStep("taste", false);
  const handleBackToDNA = () => navigateToStep("dna", false);
  const handleBackToSocial = () => navigateToStep("social", false);
  const handleBackToRecommendations = () => navigateToStep("recommendations", false);
  const handleBackToFeedback = () => navigateToStep("feedback", false);

  // Show loading state while checking auth/onboarding status
  if (isChecking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-foreground/60">Loading...</p>
        </div>
      </div>
    );
  }

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
          phone={navPhone}
          onContinue={handleOTPVerify}
          onResend={handleResendPhoneOTP}
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
          email={navEmail}
          password={navPassword}
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
        <UserIdentityScreen 
          onContinue={handleIdentity} 
          onBack={handleBackToBiometric}
          initialName={onboardingData.name}
          initialVibe={onboardingData.vibe}
        />
      )}
      {currentStep === "platforms" && (
        <StreamingPlatformsScreen 
          onContinue={handlePlatforms} 
          onBack={handleBackToIdentity}
          initialPlatforms={onboardingData.platforms}
        />
      )}
      {currentStep === "languages" && (
        <LanguageSelectionScreen 
          onContinue={handleLanguages} 
          onBack={handleBackToPlatforms}
          initialLanguages={onboardingData.languages}
        />
      )}
      {currentStep === "mood" && (
        <MoodCalibrationScreen 
          onContinue={handleMood} 
          onBack={handleBackToLanguages}
          initialEnergy={onboardingData.mood.energy}
          initialPositivity={onboardingData.mood.positivity}
        />
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
