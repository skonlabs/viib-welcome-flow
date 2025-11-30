-- Seed Email Templates for ViiB Application
-- Run this in Supabase SQL Editor to populate email_templates table

INSERT INTO public.email_templates (name, subject, body, template_type, variables, is_active) VALUES

-- Welcome Email Template
(
  'welcome_email',
  'Welcome to ViiB - Your Personalized Content Discovery Journey Begins! 🎬',
  '<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px;">
      <h1 style="color: white; margin: 0;">Welcome to ViiB!</h1>
    </div>
    <div style="padding: 30px 20px;">
      <h2 style="color: #333;">Hi {{user_name}},</h2>
      <p style="color: #666; line-height: 1.6;">We are thrilled to have you join ViiB! Your journey to discovering content that truly resonates with your mood and preferences starts now.</p>
      <p style="color: #666; line-height: 1.6;">With ViiB, you will experience:</p>
      <ul style="color: #666; line-height: 1.8;">
        <li>Mood-based content recommendations</li>
        <li>Personalized viewing suggestions</li>
        <li>Social discovery with friends</li>
        <li>Smart content matching</li>
      </ul>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{app_url}}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; display: inline-block;">Start Exploring</a>
      </div>
      <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">Questions? Reply to this email or visit our help center.</p>
    </div>
  </body></html>',
  'notification',
  '{"user_name": "string", "app_url": "string"}',
  true
),

-- Phone OTP Verification Template
(
  'phone_otp_verification',
  'Your ViiB Verification Code',
  '<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; padding: 20px;">
      <h1 style="color: #333;">Verification Code</h1>
    </div>
    <div style="padding: 20px; background: #f8f9fa; border-radius: 10px; text-align: center;">
      <p style="color: #666; margin-bottom: 20px;">Your ViiB verification code is:</p>
      <div style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; margin: 20px 0;">{{otp_code}}</div>
      <p style="color: #999; font-size: 14px; margin-top: 20px;">This code expires in {{expiry_minutes}} minutes</p>
    </div>
    <div style="padding: 20px; text-align: center;">
      <p style="color: #666;">If you did not request this code, please ignore this email.</p>
      <p style="color: #999; font-size: 12px; margin-top: 30px;">For security reasons, never share this code with anyone.</p>
    </div>
  </body></html>',
  'verification',
  '{"otp_code": "string", "expiry_minutes": "number"}',
  true
),

-- Email OTP Verification Template
(
  'email_otp_verification',
  'Verify Your Email - ViiB',
  '<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; padding: 20px;">
      <h1 style="color: #333;">Email Verification</h1>
    </div>
    <div style="padding: 20px;">
      <p style="color: #666;">Hi {{user_name}},</p>
      <p style="color: #666;">To complete your ViiB registration, please verify your email address using the code below:</p>
    </div>
    <div style="padding: 20px; background: #f8f9fa; border-radius: 10px; text-align: center;">
      <div style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; margin: 20px 0;">{{otp_code}}</div>
      <p style="color: #999; font-size: 14px;">This code expires in {{expiry_minutes}} minutes</p>
    </div>
    <div style="padding: 20px; text-align: center;">
      <p style="color: #999; font-size: 12px;">If you did not create a ViiB account, you can safely ignore this email.</p>
    </div>
  </body></html>',
  'verification',
  '{"user_name": "string", "otp_code": "string", "expiry_minutes": "number"}',
  true
),

-- Password Reset Template
(
  'password_reset',
  'Reset Your ViiB Password',
  '<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; padding: 20px;">
      <h1 style="color: #333;">Password Reset Request</h1>
    </div>
    <div style="padding: 20px;">
      <p style="color: #666;">Hi {{user_name}},</p>
      <p style="color: #666;">We received a request to reset your ViiB password. Use the verification code below to proceed:</p>
    </div>
    <div style="padding: 20px; background: #f8f9fa; border-radius: 10px; text-align: center;">
      <div style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; margin: 20px 0;">{{otp_code}}</div>
      <p style="color: #999; font-size: 14px;">This code expires in {{expiry_minutes}} minutes</p>
    </div>
    <div style="padding: 20px; text-align: center;">
      <p style="color: #666;">If you did not request a password reset, please ignore this email and your password will remain unchanged.</p>
      <p style="color: #999; font-size: 12px; margin-top: 30px;">For your security, never share this code with anyone.</p>
    </div>
  </body></html>',
  'transactional',
  '{"user_name": "string", "otp_code": "string", "expiry_minutes": "number"}',
  true
),

-- Feedback Received Template
(
  'feedback_received',
  'We Received Your Feedback - ViiB',
  '<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; padding: 20px;">
      <h1 style="color: #333;">Thank You for Your Feedback!</h1>
    </div>
    <div style="padding: 20px;">
      <p style="color: #666;">Hi {{user_name}},</p>
      <p style="color: #666;">Thank you for taking the time to share your feedback with us. We have received your {{feedback_type}} and our team will review it shortly.</p>
      <div style="padding: 20px; background: #f8f9fa; border-radius: 10px; margin: 20px 0;">
        <p style="color: #666; margin: 0;"><strong>Feedback Type:</strong> {{feedback_type}}</p>
        <p style="color: #666; margin: 10px 0 0 0;"><strong>Status:</strong> Under Review</p>
      </div>
      <p style="color: #666;">Your input helps us improve ViiB for everyone. We will keep you updated on any actions taken based on your feedback.</p>
    </div>
    <div style="padding: 20px; text-align: center;">
      <p style="color: #999; font-size: 12px;">Have more feedback? You can always reach us through the app.</p>
    </div>
  </body></html>',
  'notification',
  '{"user_name": "string", "feedback_type": "string"}',
  true
),

-- Account Activation Template
(
  'account_activation',
  'Your ViiB Account is Now Active! 🎉',
  '<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px;">
      <h1 style="color: white; margin: 0;">Account Activated!</h1>
    </div>
    <div style="padding: 30px 20px;">
      <p style="color: #666;">Hi {{user_name}},</p>
      <p style="color: #666;">Great news! Your ViiB account is now fully activated and ready to use.</p>
      <p style="color: #666;">You can now:</p>
      <ul style="color: #666; line-height: 1.8;">
        <li>Get personalized content recommendations</li>
        <li>Track your viewing preferences</li>
        <li>Connect with friends</li>
        <li>Discover new content based on your mood</li>
      </ul>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{app_url}}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; display: inline-block;">Start Exploring ViiB</a>
      </div>
    </div>
  </body></html>',
  'transactional',
  '{"user_name": "string", "app_url": "string"}',
  true
),

-- Friend Recommendation Template
(
  'friend_recommendation',
  '{{sender_name}} Recommends: {{title_name}} on ViiB',
  '<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; color: white;">
      <h1 style="margin: 0;">New Recommendation!</h1>
    </div>
    <div style="padding: 30px 20px;">
      <p style="color: #666;">Hi {{receiver_name}},</p>
      <p style="color: #666;"><strong>{{sender_name}}</strong> thinks you will love this:</p>
      <div style="padding: 20px; background: #f8f9fa; border-radius: 10px; margin: 20px 0;">
        <h2 style="color: #333; margin: 0 0 10px 0;">{{title_name}}</h2>
        <p style="color: #666; margin: 0;">{{message}}</p>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{view_url}}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; display: inline-block;">View Recommendation</a>
      </div>
    </div>
  </body></html>',
  'notification',
  '{"sender_name": "string", "receiver_name": "string", "title_name": "string", "message": "string", "view_url": "string"}',
  true
),

-- Weekly Digest Template
(
  'weekly_digest',
  'Your Weekly ViiB Digest - Personalized Picks',
  '<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px;">
      <h1 style="color: white; margin: 0;">Your Weekly Picks</h1>
    </div>
    <div style="padding: 30px 20px;">
      <p style="color: #666;">Hi {{user_name}},</p>
      <p style="color: #666;">Here are your top personalized recommendations this week:</p>
      <div style="padding: 20px; background: #f8f9fa; border-radius: 10px; margin: 20px 0;">
        {{recommendations_html}}
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{app_url}}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; display: inline-block;">Explore More</a>
      </div>
    </div>
  </body></html>',
  'marketing',
  '{"user_name": "string", "recommendations_html": "string", "app_url": "string"}',
  true
)

ON CONFLICT (name) DO UPDATE SET
  subject = EXCLUDED.subject,
  body = EXCLUDED.body,
  template_type = EXCLUDED.template_type,
  variables = EXCLUDED.variables,
  is_active = EXCLUDED.is_active,
  updated_at = now();
