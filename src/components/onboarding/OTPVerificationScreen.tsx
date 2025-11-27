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
    // First check if phone is already verified
    const { data: existingUser } = await supabase
      .from('users')
      .select('is_phone_verified, signup_method')
      .eq('phone_number', phone)
      .maybeSingle();

    if (existingUser?.is_phone_verified && existingUser?.signup_method === 'phone') {
      throw new Error("This phone number is already registered. Please sign in to continue.");
    }

    const { data, error: invokeError } = await supabase.functions.invoke("verify-phone-otp", {
      body: { phoneNumber: phone, otpCode: code },
    });

    if (invokeError) {
      throw new Error("Unable to verify code. Please try again.");
    }

    if (!data?.success) {
      throw new Error(data?.error || "Invalid code. Please check and try again.");
    }

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