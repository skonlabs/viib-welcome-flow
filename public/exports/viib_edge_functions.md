# ViiB Edge Functions Reference
Generated: 2024-12-15

## Overview
This document lists all Supabase Edge Functions in the ViiB project.

---

## Authentication Functions

### `send-phone-otp`
Sends OTP verification code via SMS to phone number.
- **Method:** POST
- **Body:** `{ phone_number: string }`
- **Returns:** Success/error status

### `verify-phone-otp`
Verifies phone OTP code.
- **Method:** POST
- **Body:** `{ phone_number: string, otp_code: string }`
- **Returns:** Verification status

### `send-email-otp`
Sends OTP verification code via email.
- **Method:** POST
- **Body:** `{ email: string }`
- **Returns:** Success/error status

### `verify-email-otp`
Verifies email OTP code.
- **Method:** POST
- **Body:** `{ email: string, otp_code: string }`
- **Returns:** Verification status

### `hash-password`
Hashes password using bcrypt for secure storage.
- **Method:** POST
- **Body:** `{ password: string }`
- **Returns:** `{ hash: string }`

### `verify-password`
Verifies password against stored hash.
- **Method:** POST
- **Body:** `{ password: string, hash: string }`
- **Returns:** `{ valid: boolean }`

---

## Title Sync Functions

### `full-refresh-titles`
Full refresh of title catalog from TMDB API.
- **Method:** POST
- **Body:** `{ languageCode: string, year: number, genreId: number, jobId: string }`
- **Processes:** Fetches movies and TV shows from TMDB, stores in titles table
- **Features:** Parallel execution support, streaming service filtering, YouTube trailer fallback

### `full-refresh-orchestrator`
Orchestrates parallel execution of full-refresh-titles.
- **Method:** POST
- **Body:** `{ jobId: string, chunks: Array, startIndex: number }`
- **Features:** Background execution, work unit tracking, staggered invocation

### `sync-titles-delta`
Nightly delta sync for new/updated titles.
- **Method:** POST
- **Body:** `{ jobId?: string }`
- **Processes:** Fetches recently updated titles from TMDB with configurable lookback period

### `enrich-title-trailers`
Enriches titles with trailer URLs from TMDB and YouTube.
- **Method:** POST
- **Body:** `{ batchSize?: number, startOffset?: number, jobId?: string }`
- **Features:** Prioritizes official trailer channels, batch processing

### `enrich-title-details`
Enriches titles with additional metadata from TMDB.
- **Method:** POST
- **Body:** `{ titleIds?: string[] }`
- **Processes:** Keywords, spoken languages, additional metadata

### `transcribe-trailers`
Transcribes trailer videos to text using Whisper API.
- **Method:** POST
- **Body:** `{ jobId?: string }`
- **Features:** Supadata API for YouTube, OpenAI Whisper for other sources, language translation

---

## AI Classification Functions

### `classify-title-emotions`
Classifies titles with emotional signatures using GPT-4.
- **Method:** POST
- **Body:** `{ jobId?: string, batchSize?: number, cursor?: string }`
- **Processes:** Analyzes titles using transcripts/overviews, stores in staging table
- **Features:** Continuous batch processing, cursor-based pagination

### `promote-title-emotions`
Promotes emotional signatures from staging to production table.
- **Method:** POST
- **Body:** `{ batchSize?: number }`
- **Processes:** Moves data from staging, triggers materialization refreshes

---

## Search Functions

### `search-tmdb`
Searches TMDB for movies and TV shows.
- **Method:** POST
- **Body:** `{ query: string, types?: string[], page?: number }`
- **Returns:** Enriched search results with streaming availability

---

## Communication Functions

### `send-invites`
Sends invitation emails to new users.
- **Method:** POST
- **Body:** `{ emails: string[], message?: string }`

### `send-activation-invite`
Sends activation code invitation.
- **Method:** POST
- **Body:** `{ email: string, code: string }`

---

## Edge Function Locations

All edge functions are located in `supabase/functions/`:

```
supabase/functions/
├── classify-title-emotions/
│   └── index.ts
├── enrich-title-details/
│   └── index.ts
├── enrich-title-trailers/
│   └── index.ts
├── full-refresh-orchestrator/
│   └── index.ts
├── full-refresh-titles/
│   └── index.ts
├── hash-password/
│   └── index.ts
├── promote-title-emotions/
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

## Required Secrets

The following secrets must be configured in Supabase:

| Secret | Description |
|--------|-------------|
| `TMDB_API_KEY` | The Movie Database API key |
| `YOUTUBE_API_KEY` | YouTube Data API key |
| `OPENAI_API_KEY` | OpenAI API key for GPT-4 classification |
| `SUPADATA_API_KEY` | Supadata API key for YouTube transcription |
| `TWILIO_ACCOUNT_SID` | Twilio account SID for SMS |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Twilio phone number for sending SMS |

---

## Job Configuration

Jobs are configured in the `jobs` table:

| Job Type | Edge Function | Description |
|----------|---------------|-------------|
| `full_refresh` | `full-refresh-orchestrator` | Full catalog refresh |
| `sync_delta` | `sync-titles-delta` | Nightly delta sync |
| `enrich_trailers` | `enrich-title-trailers` | Trailer enrichment |
| `transcribe_trailers` | `transcribe-trailers` | Trailer transcription |
| `classify_emotions` | `classify-title-emotions` | AI emotion classification |
| `promote_emotions` | `promote-title-emotions` | Staging to production promotion |
