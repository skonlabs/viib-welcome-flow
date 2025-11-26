-- Create phone_verifications table for custom phone authentication
CREATE TABLE IF NOT EXISTS public.phone_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;

-- Create index for faster lookups
CREATE INDEX idx_phone_verifications_phone_number ON public.phone_verifications(phone_number);
CREATE INDEX idx_phone_verifications_expires_at ON public.phone_verifications(expires_at);

-- RLS Policies (allow anyone to create and verify, system will handle validation)
CREATE POLICY "Allow insert for phone verification" ON public.phone_verifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow select for phone verification" ON public.phone_verifications
  FOR SELECT USING (true);

CREATE POLICY "Allow update for phone verification" ON public.phone_verifications
  FOR UPDATE USING (true);