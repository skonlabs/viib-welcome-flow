# ViiB Database Seed Data

This directory contains SQL scripts to populate your ViiB application with default rate limiting rules, email templates, and email configuration.

## Files Overview

1. **seed-rate-limits.sql** - Populates rate limiting rules for all API endpoints
2. **seed-email-templates.sql** - Creates default email templates for notifications, verifications, etc.
3. **seed-email-config.sql** - Sets up initial SMTP email configuration

## How to Run These Scripts

### Option 1: Supabase SQL Editor (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the contents of each SQL file
5. Click **Run** to execute

Run the scripts in this order:
1. `seed-rate-limits.sql`
2. `seed-email-templates.sql`
3. `seed-email-config.sql` (remember to update credentials!)

### Option 2: Supabase CLI

If you have the Supabase CLI installed:

```bash
# From your project root
supabase db execute -f supabase/seed-rate-limits.sql
supabase db execute -f supabase/seed-email-templates.sql
supabase db execute -f supabase/seed-email-config.sql
```

## Important Notes

### Rate Limiting Rules

The rate limiting configuration includes:
- **Authentication endpoints**: Strict limits (3-10 requests per time window)
- **OTP endpoints**: 5 requests per 5 minutes to prevent spam
- **Content discovery**: 20-50 requests per minute
- **Admin endpoints**: 100 requests per minute
- **General API**: 100 requests per minute default

All rate limits use `ON CONFLICT` clauses, so running the script multiple times is safe.

### Email Templates

The following templates are included:
- **welcome_email** - Sent when users complete registration
- **phone_otp_verification** - Phone number verification codes
- **email_otp_verification** - Email verification codes
- **password_reset** - Password reset codes
- **feedback_received** - Feedback submission confirmation
- **account_activation** - Account activation notification
- **friend_recommendation** - Social content recommendations
- **weekly_digest** - Weekly personalized picks (marketing)

Template variables use `{{variable_name}}` syntax for dynamic content replacement.

### Email Configuration

**⚠️ IMPORTANT:** Before running `seed-email-config.sql`, you must:

1. **Update SMTP credentials** with your actual email service credentials
2. For Gmail users:
   - Enable 2-factor authentication on your Google account
   - Generate an App Password at https://myaccount.google.com/apppasswords
   - Use the App Password (not your regular password) in the script

3. For other email providers:
   - Update `smtp_host` and `smtp_port` accordingly
   - Common configurations:
     - Gmail: `smtp.gmail.com:465` (SSL) or `smtp.gmail.com:587` (TLS)
     - SendGrid: `smtp.sendgrid.net:587`
     - AWS SES: `email-smtp.region.amazonaws.com:587`
     - Mailgun: `smtp.mailgun.org:587`

## Alternative: Use the Admin UI

Instead of running these SQL scripts, you can also:
1. Log in as an admin user
2. Navigate to `/app/admin`
3. Use the **Email Setup**, **Email Templates**, and **Rate Limiting** interfaces to configure these settings through the UI

## Security Considerations

- **Never commit SMTP passwords** to version control
- Consider using Supabase secrets/vault for sensitive credentials
- Regularly rotate SMTP passwords
- Monitor rate limit violations in your application logs
- Keep email templates updated with current branding and messaging

## Customization

Feel free to modify these scripts to match your specific requirements:
- Adjust rate limits based on your API usage patterns
- Customize email templates with your branding
- Add new templates for additional use cases
- Configure alternative SMTP providers

## Troubleshooting

### Rate Limits Not Working
- Ensure the `rate_limit_config` table exists
- Verify `is_active = true` for rules you want to enforce
- Check your middleware is querying this table

### Emails Not Sending
- Verify SMTP credentials are correct
- Check if your email provider requires App Passwords (Gmail, Yahoo, etc.)
- Ensure `is_active = true` in email_config table
- Check Supabase edge function logs for detailed error messages

### Template Variables Not Replacing
- Ensure variable names in templates match exactly what your code provides
- Variables should use `{{variable_name}}` syntax (double curly braces)
- Check that your email sending function is passing the correct variable object

## Need Help?

If you encounter issues:
1. Check Supabase logs in the Dashboard
2. Review edge function logs for email sending errors
3. Verify database tables were created correctly with the migrations
4. Check the admin UI for configuration status
