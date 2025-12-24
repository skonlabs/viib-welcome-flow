# ViiB Edge Functions Complete Documentation
Generated: 2024-12-24

## Overview

All edge functions are located in `supabase/functions/` directory.

---

## Authentication Functions

### send-phone-otp
**Purpose:** Sends an OTP code to a phone number via Twilio SMS  
**Method:** POST  
**Public:** Yes (verify_jwt = false)  
**Request Body:**
```json
{
  "phone_number": "+1234567890"
}
```
**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully"
}
```
**Required Secrets:** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`

---

### verify-phone-otp
**Purpose:** Verifies an OTP code for phone authentication  
**Method:** POST  
**Public:** Yes (verify_jwt = false)  
**Request Body:**
```json
{
  "phone_number": "+1234567890",
  "otp_code": "123456"
}
```
**Response:**
```json
{
  "success": true,
  "user_id": "uuid",
  "is_new_user": false
}
```

---

### send-email-otp
**Purpose:** Sends an OTP code to an email address  
**Method:** POST  
**Public:** Yes (verify_jwt = false)  
**Request Body:**
```json
{
  "email": "user@example.com"
}
```
**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully"
}
```

---

### verify-email-otp
**Purpose:** Verifies an OTP code for email authentication  
**Method:** POST  
**Public:** Yes (verify_jwt = false)  
**Request Body:**
```json
{
  "email": "user@example.com",
  "otp_code": "123456"
}
```
**Response:**
```json
{
  "success": true,
  "user_id": "uuid",
  "is_new_user": false
}
```

---

### hash-password
**Purpose:** Hashes a password using bcrypt  
**Method:** POST  
**Public:** Yes  
**Request Body:**
```json
{
  "password": "user_password"
}
```
**Response:**
```json
{
  "hash": "$2a$10$..."
}
```

---

### verify-password
**Purpose:** Verifies a password against a bcrypt hash  
**Method:** POST  
**Public:** Yes  
**Request Body:**
```json
{
  "password": "user_password",
  "hash": "$2a$10$..."
}
```
**Response:**
```json
{
  "valid": true
}
```

---

## Title Sync & Enrichment Functions

### full-refresh-titles
**Purpose:** Performs a full refresh of titles from TMDB API  
**Method:** POST  
**Public:** Yes  
**Request Body:**
```json
{
  "languageCode": "en",
  "year": 2024,
  "genreId": 28,
  "jobId": "uuid"
}
```
**Required Secrets:** `TMDB_API_KEY`

---

### sync-titles-delta
**Purpose:** Syncs only recently changed titles from TMDB  
**Method:** POST  
**Public:** Yes  
**Request Body:**
```json
{
  "jobId": "uuid"
}
```
**Required Secrets:** `TMDB_API_KEY`

---

### full-refresh-orchestrator
**Purpose:** Orchestrates a complete refresh of all titles across languages/years  
**Method:** POST  
**Public:** Yes  
**Request Body:**
```json
{
  "jobId": "uuid"
}
```

---

### enrich-title-details
**Purpose:** Enriches individual titles with additional metadata  
**Method:** POST  
**Public:** Yes  
**Request Body:**
```json
{
  "titleIds": ["uuid1", "uuid2"]
}
```
**Required Secrets:** `TMDB_API_KEY`

---

### enrich-title-details-batch
**Purpose:** Batch enriches titles with posters, overviews, trailers, and transcripts  
**Method:** POST  
**Public:** Yes  
**Request Body:**
```json
{
  "batchSize": 20,
  "includeSeasons": true,
  "jobId": "uuid"
}
```
**Required Secrets:** `TMDB_API_KEY`, `YOUTUBE_API_KEY`, `SUPADATA_API_KEY`

---

### enrich-title-trailers
**Purpose:** Fetches trailer URLs for titles from TMDB/YouTube  
**Method:** POST  
**Public:** Yes  
**Request Body:**
```json
{
  "batchSize": 50,
  "startOffset": 0,
  "jobId": "uuid"
}
```
**Required Secrets:** `TMDB_API_KEY`, `YOUTUBE_API_KEY`

---

### transcribe-trailers
**Purpose:** Transcribes trailer audio using external API  
**Method:** POST  
**Public:** Yes  
**Request Body:**
```json
{
  "jobId": "uuid"
}
```
**Required Secrets:** `SUPADATA_API_KEY`

---

## AI Classification Functions

### classify-title-ai
**Purpose:** Uses GPT-4 to classify title emotions and intents  
**Method:** POST  
**Public:** Yes  
**Request Body:**
```json
{
  "jobId": "uuid",
  "batchSize": 10,
  "cursor": "uuid"
}
```
**Required Secrets:** `OPENAI_API_KEY`

---

### promote-title-ai
**Purpose:** Promotes AI classifications from staging to production tables  
**Method:** POST  
**Public:** Yes  
**Request Body:**
```json
{
  "batchSize": 500
}
```

---

## Search Functions

### search-tmdb
**Purpose:** Searches TMDB for movies and TV shows  
**Method:** POST  
**Public:** Yes  
**Request Body:**
```json
{
  "query": "inception",
  "types": ["movie", "tv"],
  "page": 1
}
```
**Response:**
```json
{
  "results": [...],
  "total_results": 100,
  "total_pages": 5
}
```
**Required Secrets:** `TMDB_API_KEY`

---

## Communication Functions

### send-invites
**Purpose:** Sends invitation emails to multiple recipients  
**Method:** POST  
**Public:** Yes  
**Request Body:**
```json
{
  "emails": ["user1@example.com", "user2@example.com"],
  "message": "Join ViiB!"
}
```

---

### send-activation-invite
**Purpose:** Sends an activation code to a specific email  
**Method:** POST  
**Public:** Yes  
**Request Body:**
```json
{
  "email": "user@example.com",
  "code": "VIIB2024"
}
```

---

## Analytics Functions

### get-analytics
**Purpose:** Retrieves analytics data for the admin dashboard  
**Method:** GET  
**Public:** Yes  
**Query Parameters:**
- `type`: Type of analytics (users, titles, interactions, etc.)
- `from`: Start date
- `to`: End date

---

## Required Secrets Summary

| Secret Name | Used By |
|------------|---------|
| `SUPABASE_URL` | All functions (auto-provided) |
| `SUPABASE_ANON_KEY` | All functions (auto-provided) |
| `SUPABASE_SERVICE_ROLE_KEY` | All functions (auto-provided) |
| `TMDB_API_KEY` | full-refresh-titles, sync-titles-delta, enrich-title-details, enrich-title-trailers, search-tmdb |
| `YOUTUBE_API_KEY` | enrich-title-trailers |
| `OPENAI_API_KEY` | classify-title-ai |
| `SUPADATA_API_KEY` | transcribe-trailers, enrich-title-details-batch |
| `TWILIO_ACCOUNT_SID` | send-phone-otp |
| `TWILIO_AUTH_TOKEN` | send-phone-otp |
| `TWILIO_PHONE_NUMBER` | send-phone-otp |

---

## Edge Function Directory Structure

```
supabase/functions/
├── classify-title-ai/
│   └── index.ts
├── enrich-title-details/
│   └── index.ts
├── enrich-title-details-batch/
│   └── index.ts
├── enrich-title-trailers/
│   └── index.ts
├── full-refresh-orchestrator/
│   └── index.ts
├── full-refresh-titles/
│   └── index.ts
├── get-analytics/
│   └── index.ts
├── hash-password/
│   └── index.ts
├── promote-title-ai/
│   └── index.ts
├── search-tmdb/
│   └── index.ts
├── send-activation-invite/
│   └── index.ts
├── send-email-otp/
│   └── index.ts
├── send-invites/
│   └── index.ts
├── send-phone-otp/
│   └── index.ts
├── sync-titles-delta/
│   └── index.ts
├── transcribe-trailers/
│   └── index.ts
├── verify-email-otp/
│   └── index.ts
├── verify-password/
│   └── index.ts
└── verify-phone-otp/
    └── index.ts
```

---

## Calling Edge Functions

### From Frontend (React)
```typescript
import { supabase } from "@/integrations/supabase/client";

const { data, error } = await supabase.functions.invoke('function-name', {
  body: { key: 'value' }
});
```

### Direct HTTP Call
```bash
curl -X POST \
  'https://ibrjwldvyuhwcfzdmimv.supabase.co/functions/v1/function-name' \
  -H 'Authorization: Bearer ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"key": "value"}'
```

---

## Configuration (supabase/config.toml)

Functions that are public (no JWT required) have:
```toml
[functions.function-name]
verify_jwt = false
```
