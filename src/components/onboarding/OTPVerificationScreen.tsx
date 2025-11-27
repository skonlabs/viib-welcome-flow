import { supabase } from "@/integrations/supabase/client";
import { OTPVerificationBase } from "./OTPVerificationBase";

interface OTPVerificationScreenProps {
  phone: string;
  onContinue: (otp: string) => void;
  onResend: () => void;
  onChangeNumber: () => void;
}

export const OTPVerificationScreen = ({
  phone,
  onContinue,
  onResend,
  onChangeNumber,
}: OTPVerificationScreenProps) => {
  const formatPhoneNumber = (phoneNumber: string) => {
    const cleaned = phoneNumber.replace(/\D/g, "");
    if (cleaned.length === 11 && cleaned.startsWith("1")) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    } else if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phoneNumber;
  };

  const handleVerify = async (code: string) => {
    console.log("Verifying OTP for phone:", phone);

    if (!phone || phone.trim() === '') {
      throw new Error("Phone number is missing. Please go back and enter your phone number again.");
    }

    // Check if phone is already verified with completed onboarding
    const { data: existingUser } = await supabase
      .from('users')
      .select('is_phone_verified, signup_method, onboarding_completed')
      .eq('phone_number', phone)
      .maybeSingle();

    // Only block if user has BOTH verified phone AND completed onboarding
    if (existingUser?.is_phone_verified && existingUser?.signup_method === 'phone' && existingUser?.onboarding_completed) {
      throw new Error("This phone number is already registered. Please sign in to continue.");
    }

    // Verify the OTP code - this checks if code is correct and not expired
    const { data, error: invokeError } = await supabase.functions.invoke("verify-phone-otp", {
      body: { phoneNumber: phone, otpCode: code },
    });

    if (invokeError) {
      console.error("Edge function error:", invokeError);
      throw new Error("Unable to verify code. Please try again.");
    }

    if (!data?.success) {
      throw new Error(data?.error || "Invalid code. Please check and try again.");
    }

    // OTP is valid - pass control to parent to create user account
    onContinue(code);
  };

  const handleResend = async () => {
    const { error: invokeError } = await supabase.functions.invoke("send-phone-otp", {
      body: { phoneNumber: phone },
    });

    if (invokeError) {
      throw new Error("Unable to resend code. Please try again.");
    }

    onResend();
  };

  return (
    <OTPVerificationBase
      icon="📱"
      title="Check your phone"
      contactInfo={formatPhoneNumber(phone)}
      onVerify={handleVerify}
      onResend={handleResend}
      onChangeContact={onChangeNumber}
      changeContactLabel="Change Number"
    />
  );
};