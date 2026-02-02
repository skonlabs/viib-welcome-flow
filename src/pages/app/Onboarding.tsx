import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { WelcomeScreen } from "@/components/onboarding/WelcomeScreen";
import { EntryMethodScreen } from "@/components/onboarding/EntryMethodScreen";
import { PhoneEntryScreen } from "@/components/onboarding/PhoneEntryScreen";
import { OTPVerificationScreen } from "@/components/onboarding/OTPVerificationScreen";
import { EmailSignupScreen } from "@/components/onboarding/EmailSignupScreen";
import { EmailOTPVerificationScreen } from "@/components/onboarding/EmailOTPVerificationScreen";
import { UserIdentityScreen } from "@/components/onboarding/UserIdentityScreen";
import { StreamingPlatformsScreen } from "@/components/onboarding/StreamingPlatformsScreen";
import { LanguageSelectionScreen } from "@/components/onboarding/LanguageSelectionScreen";
import { MoodCalibrationScreen } from "@/components/onboarding/MoodCalibrationScreen";
import { VisualTasteScreen } from "@/components/onboarding/VisualTasteScreen";
import { SocialConnectionScreen } from "@/components/onboarding/SocialConnectionScreen";
import { CompletionScreen } from "@/components/onboarding/CompletionScreen";
import { OnboardingProgressBar } from "@/components/onboarding/OnboardingProgressBar";
import { useNavigate, useParams, useLocation } from "react-router-dom";

type OnboardingStep =
  | "welcome"
  | "entry"
  | "phone"
  | "otp"
  | "email"
  | "email-otp"
  | "identity"
  | "platforms"
  | "languages"
  | "mood"
  | "taste"
  | "social"
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
  const { refreshProfile } = useAuth();
  
  // Load saved onboarding data on mount
  useEffect(() => {
    const loadSavedData = async () => {
      const userId = localStorage.getItem('viib_user_id');
      if (!userId) return;

      try {
        // Batch all queries in parallel for better performance
        const [userResult, vibeResult, platformsResult, languagesResult] = await Promise.all([
          supabase
            .from('users')
            .select('full_name, phone_number, email')
            .eq('id', userId)
            .single(),
          supabase
            .from('user_vibe_preferences')
            .select('vibe_type')
            .eq('user_id', userId)
            .maybeSingle(),
          supabase
            .from('user_streaming_subscriptions')
            .select('streaming_service_id')
            .eq('user_id', userId)
            .eq('is_active', true),
          supabase
            .from('user_language_preferences')
            .select('language_code')
            .eq('user_id', userId)
            .order('priority_order'),
        ]);

        const userData = userResult.data;
        const vibeData = vibeResult.data;
        const platformsData = platformsResult.data;
        const languagesData = languagesResult.data;

        // Note: Mood data is loaded directly by MoodCalibrationScreen from user_emotion_states
        // No need to reverse-map here as the component handles its own restoration

        if (userData) {
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
      } catch {
        // Saved data loading is optional; onboarding will work with defaults
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
          "welcome", "entry", "phone", "otp", "email", "email-otp", "identity",
          "platforms", "languages", "mood", "taste", "social", "completion"
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
      // Apple sign in - skip to identity
      navigateToStep("identity");
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
    
    // If user exists with verified phone, they're resuming onboarding
    if (existingUser && existingUser.is_phone_verified) {
      localStorage.setItem('viib_user_id', existingUser.id);
      localStorage.setItem('viib_resume_onboarding', 'true');
      
      // Mark the OTP as verified to clean up the verification record
      await supabase
        .from('phone_verifications')
        .update({ verified: true })
        .eq('phone_number', fullPhone)
        .eq('otp_code', otp)
        .eq('verified', false);
      
      navigateToStep("identity");
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
        throw error;
      }

      if (insertedUser) {
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
            let countryCode = 'US'; // Default to US
            try {
              const geoResponse = await fetch(`https://ipapi.co/${ipAddress}/json/`, {
                signal: AbortSignal.timeout(5000)
              });
              if (geoResponse.ok) {
                const geoData = await geoResponse.json();
                ipCountry = geoData.country_name || 'Unknown';
                countryCode = geoData.country_code || 'US'; // Get 2-letter code
              }
            } catch {
              // Geo lookup failed - continue with defaults
            }

            // Update user with IP data AND country code for streaming availability
            await supabase
              .from('users')
              .update({ 
                ip_address: ipAddress, 
                ip_country: ipCountry,
                country: countryCode // Set the country code for recommendations
              })
              .eq('id', insertedUser.id);

          } catch {
            // IP lookup failed - non-critical, user record already created
          }
        })();
      }
    } catch (error) {
      throw error;
    }
    
    navigateToStep("identity");
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
    
    navigateToStep("identity");
  };

  const handleResendPhoneOTP = async () => {
    const { error } = await supabase.functions.invoke("send-phone-otp", {
      body: { phoneNumber: navPhone },
    });
    if (error) {
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
      throw error;
    }
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
    if (userId) {
      // Delete existing subscriptions first
      await supabase
        .from('user_streaming_subscriptions')
        .delete()
        .eq('user_id', userId);
      
      // Insert new subscriptions if any selected
      if (platforms.length > 0) {
        const subscriptions = platforms.map(serviceId => ({
          user_id: userId,
          streaming_service_id: serviceId,
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
    if (userId) {
      // Delete existing preferences first
      await supabase
        .from('user_language_preferences')
        .delete()
        .eq('user_id', userId);
      
      // Insert new preferences if any selected
      if (languages.length > 0) {
        const preferences = languages.map((language_code, index) => ({
          user_id: userId,
          language_code,
          priority_order: index + 1
        }));
        
        await supabase
          .from('user_language_preferences')
          .insert(preferences);
      }
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
    navigateToStep("social");
  };

  const handleSocial = () => {
    navigateToStep("completion");
  };

  const handleComplete = async () => {
    try {
      let userId: string | null = null;
      let userData: { email: string | null; password_hash: string | null; signup_method: string | null } | null = null;
      
      // First, try to get user from Supabase Auth session (preferred method)
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (authUser) {
        // Get the linked user profile from users table
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('id, email, password_hash, signup_method')
          .eq('auth_id', authUser.id)
          .maybeSingle();
        
        if (profileData) {
          userId = profileData.id;
          userData = profileData;
        }
      }
      
      // Fallback to localStorage if no auth session (legacy support)
      if (!userId) {
        const storedUserId = localStorage.getItem('viib_user_id');
        
        if (storedUserId) {
          const { data: storedUserData, error: userError } = await supabase
            .from('users')
            .select('id, email, password_hash, signup_method')
            .eq('id', storedUserId)
            .maybeSingle();
          
          if (storedUserData) {
            userId = storedUserData.id;
            userData = storedUserData;
          }
        }
      }
      
      // No user found via either method
      if (!userId || !userData) {
        localStorage.removeItem('viib_user_id');
        toast.error('Session expired. Please restart onboarding.');
        navigate('/app/onboarding');
        return;
      }
      
      // Update user record with completion status
      const { error } = await supabase
        .from('users')
        .update({
          onboarding_completed: true,
          is_active: true,
        })
        .eq('id', userId);
      
      if (error) {
        throw error;
      }
      
      // Clean up localStorage
      localStorage.removeItem('viib_resume_onboarding');
      localStorage.removeItem('viib_user_id');
      
      // If not already authenticated and we have email credentials, sign in
      if (!authUser && userData?.signup_method === 'email') {
        const email = navEmail || onboardingData.email || userData?.email;
        const password = navPassword || onboardingData.password;
        
        if (email && password) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          
          // If sign-in fails, user will need to login manually after onboarding
        }
      }
      
      // Refresh the auth context profile before navigating
      // This ensures ProtectedRoute sees the updated onboarding_completed status
      await refreshProfile();
      
      // Navigate to home screen
      navigate("/app/home");
    } catch {
      toast.error('Something went wrong. Please try again.');
    }
  };

  // Back navigation handlers - don't save progress when going backward
  const handleBackToWelcome = () => navigateToStep("welcome", false);
  const handleBackToEntry = () => navigateToStep("entry", false);
  const handleBackToVerification = () => {
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
  const handleBackToSocial = () => navigateToStep("social", false);

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

  // Calculate current step number for progress bar
  const stepOrder: OnboardingStep[] = [
    "welcome", "entry", "phone", "otp", "email", "email-otp", "identity",
    "platforms", "languages", "mood", "taste", "social", "completion"
  ];
  const currentStepNumber = stepOrder.indexOf(currentStep) + 1;
  const totalSteps = 12; // Total visible steps in progress bar
  
  // Show progress bar only after welcome
  const showProgressBar = currentStep !== "welcome";

  return (
    <div className="min-h-screen bg-black">
      {showProgressBar && (
        <OnboardingProgressBar 
          currentStep={Math.min(currentStepNumber, totalSteps)} 
          totalSteps={totalSteps} 
        />
      )}
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
      {currentStep === "identity" && (
        <UserIdentityScreen 
          onContinue={handleIdentity} 
          onBack={handleBackToVerification}
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
      {currentStep === "social" && (
        <SocialConnectionScreen
          onInvite={handleSocial}
          onSkip={handleSocial}
          onBack={handleBackToTaste}
        />
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
