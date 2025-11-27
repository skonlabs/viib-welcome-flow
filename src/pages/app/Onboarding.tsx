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
        
        // Fetch mood/emotion state
        const { data: emotionData } = await supabase
          .from('user_emotion_states')
          .select('emotion_intensity, emotion_master(emotion_label)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (userData) {
          // Fetch platforms
          const { data: platformsData } = await supabase
            .from('user_streaming_subscriptions')
            .select('streaming_service_id, streaming_services(service_name)')
            .eq('user_id', userId)
            .eq('is_active', true);
          
          // Fetch languages
          const { data: languagesData } = await supabase
            .from('user_language_preferences')
            .select('language_code')
            .eq('user_id', userId)
            .order('priority_order');
          
          // Map service names to platform IDs for the UI
          const platformNameToId: Record<string, string> = {
            'Netflix': 'netflix',
            'Prime Video': 'prime',
            'HBO Max': 'hbo',
            'Disney+': 'disney',
            'Hulu': 'hulu',
            'Apple TV+': 'apple'
          };

          // Map emotion back to energy/positivity values
          let moodData = { energy: 50, positivity: 50 }; // Default
          if (emotionData) {
            const emotionLabel = (emotionData.emotion_master as any)?.emotion_label;
            const intensity = emotionData.emotion_intensity;
            
            // Reverse the mapping from handleMood
            switch (emotionLabel) {
              case 'excited':
                moodData = { energy: 75, positivity: 75 };
                break;
              case 'calm':
                moodData = { energy: 25, positivity: 75 };
                break;
              case 'stressed':
                moodData = { energy: 75, positivity: 25 };
                break;
              case 'sad':
                moodData = { energy: 25, positivity: 25 };
                break;
              case 'hopeful':
                moodData = { energy: 50, positivity: 50 };
                break;
              default:
                moodData = { energy: 50, positivity: 50 };
            }
          }

          setOnboardingData(prev => ({
            ...prev,
            name: userData.full_name || '',
            vibe: vibeData?.vibe_type || '',
            phone: userData.phone_number || '',
            email: userData.email || '',
            platforms: platformsData?.map(p => {
              const serviceName = (p.streaming_services as any)?.service_name;
              return platformNameToId[serviceName] || serviceName;
            }).filter(Boolean) || [],
            languages: languagesData?.map(l => l.language_code) || [],
            mood: moodData,
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
        
        // NOW mark the phone verification as complete in the database
        // This must happen AFTER user creation succeeds to prevent retry issues
        await supabase
          .from('phone_verifications')
          .update({ verified: true })
          .eq('phone_number', fullPhone)
          .eq('otp_code', otp)
          .eq('verified', false);
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
    
    // Save platforms to database
    const userId = localStorage.getItem('viib_user_id');
    if (userId && platforms.length > 0) {
      // Map platform IDs to service names
      const platformIdToName: Record<string, string> = {
        'netflix': 'Netflix',
        'prime': 'Prime Video',
        'hbo': 'HBO Max',
        'disney': 'Disney+',
        'hulu': 'Hulu',
        'apple': 'Apple TV+'
      };

      const serviceNames = platforms.map(id => platformIdToName[id]).filter(Boolean);

      // First, get streaming service IDs based on platform names
      const { data: services } = await supabase
        .from('streaming_services')
        .select('id, service_name')
        .in('service_name', serviceNames);
      
      if (services && services.length > 0) {
        // Delete existing subscriptions
        await supabase
          .from('user_streaming_subscriptions')
          .delete()
          .eq('user_id', userId);
        
        // Insert new subscriptions
        const subscriptions = services.map(service => ({
          user_id: userId,
          streaming_service_id: service.id,
          is_active: true
        }));
        
        await supabase
          .from('user_streaming_subscriptions')
          .insert(subscriptions);
      }
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
    
    // Save mood to database as emotion state
    const userId = localStorage.getItem('viib_user_id');
    if (userId) {
      // Map mood values to closest emotion in emotion_master
      const e = mood.energy;
      const p = mood.positivity;
      
      let emotionLabel = '';
      let intensity = 5; // Default medium intensity (1-10 scale)
      
      if (e > 65 && p > 65) {
        emotionLabel = 'excited';
        intensity = Math.round(((e + p) / 200) * 10); // High intensity
      } else if (e < 35 && p > 65) {
        emotionLabel = 'calm';
        intensity = Math.round((p / 100) * 10);
      } else if (e > 65 && p < 35) {
        emotionLabel = 'stressed';
        intensity = Math.round((e / 100) * 10);
      } else if (e < 35 && p < 35) {
        emotionLabel = 'sad';
        intensity = Math.round(((100 - e + 100 - p) / 200) * 10);
      } else {
        emotionLabel = 'hopeful';
        intensity = 5; // Balanced state
      }
      
      // Get emotion_id from emotion_master (user_state category)
      const { data: emotion } = await supabase
        .from('emotion_master')
        .select('id')
        .eq('emotion_label', emotionLabel)
        .eq('category', 'user_state')
        .single();
      
      if (emotion) {
        // Delete previous emotion states for this user
        await supabase
          .from('user_emotion_states')
          .delete()
          .eq('user_id', userId);
        
        // Insert new emotion state
        await supabase
          .from('user_emotion_states')
          .insert({
            user_id: userId,
            emotion_id: emotion.id,
            emotion_intensity: intensity
          });
      }
    }
    
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
