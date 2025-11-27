import { supabase } from "@/integrations/supabase/client";
import { OTPVerificationBase } from "./OTPVerificationBase";

interface EmailOTPVerificationScreenProps {
  email: string;
  password: string;
  onContinue: () => void;
  onBack: () => void;
}

export const EmailOTPVerificationScreen = ({
  email,
  password,
  onContinue,
  onBack,
}: EmailOTPVerificationScreenProps) => {
  const handleVerify = async (code: string) => {
    // First check if email is already verified
    const { data: existingUser } = await supabase
      .from('users')
      .select('is_email_verified, signup_method')
      .eq('email', email)
      .maybeSingle();

    if (existingUser?.is_email_verified && existingUser?.signup_method === 'email') {
      throw new Error("An account with this email already exists. Please sign in instead.");
    }

    const { data, error: invokeError } = await supabase.functions.invoke("verify-email-otp", {
      body: { email, otp: code, password },
    });

    if (invokeError) {
      throw new Error("Unable to verify code. Please try again.");
    }

    if (!data?.success) {
      throw new Error(data?.error || "Invalid code. Please check and try again.");
    }

    onContinue();
  };

  const handleResend = async () => {
    const { error: invokeError } = await supabase.functions.invoke("send-email-otp", {
      body: { email },
    });

    if (invokeError) {
      throw new Error("Unable to resend code. Please try again.");
    }
  };

  return (
    <OTPVerificationBase
      icon="📧"
      title="Check your email"
      contactInfo={email}
      onVerify={handleVerify}
      onResend={handleResend}
      onChangeContact={onBack}
      changeContactLabel="Change Email"
    />
  );
};