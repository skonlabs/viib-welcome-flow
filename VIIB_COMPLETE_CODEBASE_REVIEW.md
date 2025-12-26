# ViiB Complete Codebase Review

**Date:** December 26, 2025
**Scope:** Every file in the codebase - 152 TypeScript/TSX files, 130 SQL/TS backend files
**Total Lines Analyzed:** ~50,000+

---

## Executive Summary

ViiB is a sophisticated mood-based entertainment recommendation platform built on React 18 + Supabase. After analyzing **every single file** in the codebase, here are the key findings:

### Overall Statistics

| Category | Count | Status |
|----------|-------|--------|
| Frontend Pages | 17 | Reviewed |
| Components | 100+ | Reviewed |
| Edge Functions | 20 | Reviewed |
| Database Migrations | 106 | Reviewed |
| Database Functions | 30+ | Reviewed |
| Hooks/Contexts/Services | 8 | Reviewed |

### Critical Issues Found: 47

| Severity | Count | Examples |
|----------|-------|----------|
| **CRITICAL** | 8 | Hardcoded OTP "111111", No JWT verification, Custom auth bypassing Supabase |
| **HIGH** | 15 | Missing RLS policies, No rate limiting, localStorage user trust |
| **MEDIUM** | 16 | Performance issues, Missing validations, Delete-then-insert patterns |
| **LOW** | 8 | Console.log in production, Hardcoded data, UI polish |

---

## Part 1: Frontend Pages Analysis (17 Pages, 4,751 Lines)

### 1.1 App Pages

#### Home.tsx (427 lines)
**Purpose:** Main recommendations page

**State Variables:**
- `recommendations` - RecommendedTitle[]
- `userWatchlist` - Set<string>
- `selectedTitle` - for details modal
- `ratingDialogOpen`, `dismissDialogOpen` - dialog controls

**API Calls:**
- `get_top_recommendations_v2` RPC (line 91-94)
- Watchlist fetch (lines 71-75)
- Title details fetch (lines 116-132)

**Issues Found:**
- Line 64: Uses custom event `viib-mood-changed` instead of proper state management
- Line 93: Recommendation limit hardcoded to 10
- Lines 153-155: Genre parsing happens in map (not memoized)
- No retry mechanism if recommendations fail

---

#### Watchlist.tsx (687 lines)
**Purpose:** User's watchlist with pending/watched/recommended tabs

**Features:**
- Full CRUD for watchlist items
- Season-level tracking for TV series
- Rating integration
- Statistics dashboard

**Issues Found:**
- Lines 123-136: Individual count queries for each list item (N+1 problem)
- Line 294: Watch duration calculation uses hardcoded `* 120`
- No pagination for large watchlists
- Multiple separate API calls that could be batched

---

#### Search.tsx (702 lines)
**Purpose:** TMDB search with filters

**State Variables (15 total):**
- `query`, `results`, `loading`
- `selectedGenres`, `selectedMoods`, `moodIntensity`
- `selectedServices`, `selectedYears`
- `suggestions`, `showDropdown`, `loadingSuggestions`
- `page`, `hasMore`, `loadingMore`

**Critical Gap Found:**
```typescript
// Lines 31-32: Mood filters exist but are NEVER USED
const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
const [moodIntensity, setMoodIntensity] = useState<number>(0.5);
// These are never sent to the search-tmdb function!
```

**Issues:**
- Lines 222-260: Sorting logic runs on every render (not memoized)
- Line 82: IntersectionObserver created/destroyed on results change
- Multiple user preference queries on mount (could batch)

---

#### Social.tsx (326 lines)
**Purpose:** Friend connections and activity feed

**Issues:**
- No loading states
- No pagination for activity feed
- Generic fallback for user names (lines 177, 219, 235, 256)

---

#### Together.tsx (11 lines)
**Purpose:** Watch together feature

**CRITICAL: EMPTY PLACEHOLDER**
```typescript
const Together = () => {
  return (
    <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
      <h1>Together</h1>
      <p>Watch together with friends and family.</p>
    </div>
  );
};
```

---

#### ViiBList.tsx (945 lines)
**Purpose:** User-created playlists

**Issues:**
- Lines 161-167: **MOCK DATA** instead of real titles
- Lines 121-145: Separate API calls for item/view/follower counts
- No pagination for large lists

---

#### Mood.tsx (30 lines)
**Purpose:** Wrapper for MoodMap component

**Issues:**
- Returns null if no user (line 17) - no loading/error state

---

#### Admin.tsx (193 lines)
**Purpose:** Admin dashboard with sidebar

**Issues:**
- Line 68: Component lookup on every render (not memoized)
- Admin check client-side only

---

#### SendFeedback.tsx (278 lines)
**Purpose:** Feedback submission

**Issues:**
- Line 66: Auto-reset after 3 seconds may be jarring
- Line 48: User ID from localStorage not validated

---

#### Onboarding.tsx (715 lines)
**Purpose:** 18-step onboarding flow

**State Management:**
- Complex object with 11 fields (lines 47-60)
- URL sync with step parameter
- Multiple database calls for loading preferences

**Issues:**
- Lines 115-133: Fragile mood reverse-mapping
- Lines 302-320: IP lookup happens synchronously
- Lines 322-335: User creation uses client-provided data
- Back navigation doesn't save progress

---

### 1.2 Auth Pages

#### Login.tsx (582 lines)
**Issues:**
- Lines 89, 245-251: Session data in localStorage/sessionStorage
- No CSRF protection visible
- No rate limiting visible

#### ForgotPassword.tsx (554 lines)
**Issues:**
- OTP inputs not auto-focused/auto-advanced
- No rate limiting on OTP requests
- OTP verification doesn't invalidate old OTPs

---

### 1.3 Static Pages

| Page | Lines | Issues |
|------|-------|--------|
| Index.tsx | 321 | Hardcoded stats (50K+ users, 4.8★), heavy animations |
| Privacy.tsx | 115 | Static content needs CMS |
| Terms.tsx | 133 | Static content needs CMS |
| About.tsx | 276 | Animations may not respect reduced motion |
| NotFound.tsx | 25 | Logs full pathname to console (line 8) |

---

## Part 2: Components Analysis (100+ Components)

### 2.1 Onboarding Components (20 files, 4,732 lines)

#### Critical Issues:

**RecommendationRevealScreen.tsx (168 lines)**
```typescript
// Lines 14-30: HARDCODED RECOMMENDATIONS
const mockRecommendations = [
  { title: "Cosmic Odyssey", reason: "Matches your love for expansive sci-fi" },
  { title: "Midnight Tales", reason: "Perfect for your contemplative vibe" },
  { title: "The Last Symphony", reason: "Emotional depth you appreciate" }
];
// Shows same 3 titles for EVERY user!
```

**VisualTasteScreen.tsx (205 lines)**
```typescript
// Lines 16-23: HARDCODED POSTERS
const MOCK_POSTERS = [
  { id: "1", title: "Epic Sci-Fi", mood: "Expansive Worlds", image: "🚀" },
  // ... using emojis instead of real images
];
```

**VisualDNARevealScreen.tsx (156 lines)**
- Line 104: Doesn't use the `selections` prop - shows hardcoded emojis

**BiometricEnableScreen.tsx (139 lines)**
- No actual biometric implementation (UI only)

**PhoneEntryScreen.tsx (233 lines)**
- Only 3 country codes supported (US, UK, India)

**StreamingPlatformsScreen.tsx (352 lines)**
- Silent error handling - errors are ignored

#### Common Issues Across All:
- Missing ARIA labels
- Incomplete keyboard navigation
- No screen reader announcements
- Heavy animations without `prefers-reduced-motion` check

---

### 2.2 Admin Components (24 files, ~7,020 lines)

#### Fully Implemented (22):
| Component | Lines | Features |
|-----------|-------|----------|
| Users.tsx | 609 | Full CRUD, filtering, pagination |
| Jobs.tsx | 2,409 | Complex job management with parallel execution |
| SocialGraph.tsx | 1,150 | Interactive 5-level network visualization |
| ActivationCodes.tsx | 468 | Code generation, email invites |
| SystemLogs.tsx | 380 | Error tracking with resolution |
| EmailTemplates.tsx | 288 | Template CRUD |
| RateLimiting.tsx | 284 | Rate limit configuration |
| Feedback.tsx | 237 | Support/bug/feature tracking |
| EmailSetup.tsx | 202 | SMTP configuration |
| ThreadMonitor.tsx | 253 | Real-time job thread monitoring |
| CronMetricsDashboard.tsx | 161 | 5-second polling metrics |
| UserRetention.tsx | 175 | D1/D7/D30 retention analysis |
| Sessions.tsx | 100 | Session analytics |
| ActiveUsers.tsx | 111 | DAU/WAU/MAU metrics |
| MoodUsage.tsx | 124 | Emotion distribution pie chart |
| Recommendations.tsx | 120 | Acceptance rate metrics |
| TitleWatch.tsx | 108 | Watchlist analytics |
| PassRate.tsx | 126 | Pass vs add ratio |
| SocialActivity.tsx | 138 | Connection metrics |

#### Placeholder Only (2):
```typescript
// ViibScoreCalculator.tsx (30 lines)
// ContentEngine.tsx (30 lines)
// Both show: "Edge functions required" message
```

#### Issues:
- **Users.tsx:** Fetches ALL users without server-side pagination
- **SocialGraph.tsx:** Loads all connections into memory
- **EmailSetup.tsx:** SMTP password stored in plain text state
- **SystemLogs.tsx:** Gets user ID from localStorage
- Multiple components use browser `confirm()` instead of proper dialogs
- 5-10 second polling intervals could be optimized

---

### 2.3 App Components (11 files)

#### AuthContext.tsx - Critical Security Issues:
```typescript
// Line 40: XSS vulnerable localStorage
const session = localStorage.getItem('viib_session');

// Line 77: Only checks is_active, no token validation
const { data: userData } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .eq('is_active', true)
  .single();

// CRITICAL: No actual Supabase Auth - custom implementation
```

#### client.ts - Hardcoded Credentials:
```typescript
// Lines 5-6: Should be environment variables
const SUPABASE_URL = "https://xxx.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6...";
```

---

### 2.4 Shared Components (9 files)

| Component | Lines | Issues |
|-----------|-------|--------|
| TitleCard.tsx | 420 | Should cache explanation data |
| TrailerDialog.tsx | 48 | No URL validation for YouTube |
| RatingDialog.tsx | 61 | None |
| ShareListDialog.tsx | 42 | None |
| RecommendTitleDialog.tsx | 184 | Weak email/phone validation |
| ManageTrustedCircleDialog.tsx | 68 | Deletes without ownership check |
| WatchlistStats.tsx | 68 | None |
| UserSocialGraph.tsx | 310 | Loads ALL connections (no limit) |
| AddTitlesToListDialog.tsx | 89 | No list ownership validation |

---

## Part 3: Edge Functions Analysis (20 Functions)

### 3.1 Critical Security Issues

#### send-phone-otp (Lines 91-92):
```typescript
// HARDCODED OTP FOR ALL USERS IN PRODUCTION
const otpCode = "111111";
// TODO comment says "for testing" but it's deployed
```

#### All Functions - No JWT Verification:
```toml
# supabase/config.toml - Line 45+
[functions.classify-title-ai]
verify_jwt = false

[functions.send-invites]
verify_jwt = false
# ... all 20 functions have verify_jwt = false
```

#### send-invites (Lines 113-142):
```typescript
// EMAIL/SMS NOT IMPLEMENTED
async function sendEmailInvite(email, senderName, inviteLink, note) {
  console.log(`[EMAIL INVITE] To: ${email}...`);
  // TODO: Implement actual email sending using Resend or Gmail SMTP
  return true; // Returns success without actually sending!
}

async function sendSMSInvite(phone, senderName, inviteLink, note) {
  console.log(`[SMS INVITE] To: ${phone}...`);
  // TODO: Implement actual SMS sending using Twilio
  return true;
}
```

#### verify-password - No Brute Force Protection:
- No rate limiting
- No account lockout after failed attempts
- No failed login attempt tracking

---

### 3.2 Function Inventory

| Function | Lines | Purpose | Status |
|----------|-------|---------|--------|
| full-refresh-orchestrator | 506 | Batch job coordinator | Complete |
| full-refresh-titles | 1,191 | TMDB worker | Complete |
| sync-titles-delta | 741 | Nightly sync | Complete |
| enrich-title-details | 238 | Fetch metadata | Complete |
| enrich-title-details-batch | 772 | Batch metadata | Complete |
| enrich-title-trailers | 699 | Trailer URLs | Complete |
| transcribe-trailers | 567 | Audio transcription | Complete |
| classify-title-ai | 599 | OpenAI classification | Complete |
| promote-title-ai | 378 | Staging → Production | Complete |
| search-tmdb | 275 | TMDB search | Complete |
| fix-streaming-availability | 351 | Fix corrupted data | Complete |
| get-analytics | 307 | Dashboard metrics | Complete |
| send-email-otp | 121 | Email OTP | Complete |
| send-phone-otp | 135 | Phone OTP | **STUB** |
| verify-email-otp | 216 | Verify email | Complete |
| verify-phone-otp | 105 | Verify phone | Complete |
| hash-password | 82 | PBKDF2 hashing | Complete |
| verify-password | 155 | Password check | Complete |
| send-activation-invite | 176 | Activation emails | Complete |
| send-invites | 143 | Friend invites | **STUB** |

---

### 3.3 Environment Variables Used

| Variable | Used By |
|----------|---------|
| SUPABASE_URL | All 20 functions |
| SUPABASE_SERVICE_ROLE_KEY | All 20 functions |
| TMDB_API_KEY | 8 functions |
| YOUTUBE_API_KEY | 6 functions |
| OPENAI_API_KEY | 3 functions |
| SUPADATA_API_KEY | 2 functions |
| GMAIL_USER, GMAIL_APP_PASSWORD | 2 functions |
| TWILIO_* | 1 function (unused) |

---

## Part 4: Database Schema Analysis (106 Migrations)

### 4.1 Table Inventory (50+ Tables)

#### Core Tables:
- `users` - User accounts
- `titles` - Movies and TV shows (unified from TMDB)
- `seasons`, `episodes` - TV structure
- `genres`, `title_genres` - Genre classification
- `keywords`, `title_keywords` - Content keywords

#### Emotion System (PAD Model):
- `emotion_master` - 50 emotions (20 user states, 30 content states)
- `user_emotion_states` - User's current emotional state
- `viib_emotion_classified_titles` - Content emotion classifications
- `viib_emotion_classified_titles_staging` - Staging before promotion
- `emotion_to_intent_map` - Emotion → Viewing intent mapping
- `emotion_transformation_map` - How content transforms emotions
- `emotion_display_phrases` - User-friendly emotion text
- `title_emotion_vectors` - Cached PAD centroids per title
- `title_transformation_scores` - Pre-computed transformations
- `title_user_emotion_match_cache` - Emotion matching cache

#### Intent System:
- `viib_intent_classified_titles` - Content intent classifications
- `viib_intent_classified_titles_staging` - Staging
- `viib_title_intent_stats` - Cached primary intent per title
- `title_intent_alignment_scores` - Pre-computed alignments

#### Social Features:
- `friend_connections` - Trust-weighted connections
- `user_social_recommendations` - Friend → Friend recommendations
- `vibe_lists` - User-created playlists
- `vibe_list_items`, `vibe_list_views`, `vibe_list_followers`, `vibe_list_shared_with`

#### Streaming:
- `streaming_services` - Netflix, Disney+, etc.
- `title_streaming_availability` - What's available where
- `user_streaming_subscriptions` - User's services

#### System:
- `jobs` - Background job tracking
- `system_logs` - Error logging
- `feedback` - User feedback
- `email_config`, `email_templates` - Email system
- `rate_limit_config` - API rate limits
- `activation_codes` - Invite codes

---

### 4.2 Key Database Functions

#### Recommendation Engine:
```sql
-- Main recommendation function (optimized)
get_top_recommendations_v2(p_user_id, p_limit DEFAULT 10)
-- Returns: title_id, base_viib_score, intent_alignment_score,
--          social_priority_score, transformation_score, final_score,
--          recommendation_reason

-- 5-component scoring
viib_score_components(p_user_id, p_title_id)
-- Returns: emotional (35%), social (20%), historical (25%),
--          context (10%), novelty (10%)

-- Human-readable explanation
explain_recommendation(p_user_id, p_title_id)
-- Returns: JSONB with full breakdown
```

#### Scoring Formula:
```
Final Score = MAX(
  Base Score × Intent Alignment,
  Social Priority Score
)

Base Score =
  0.35 × Emotional +
  0.20 × Social +
  0.25 × Historical +
  0.10 × Context +
  0.10 × Novelty
```

#### Cache Refresh:
```sql
refresh_all_recommendation_caches()
-- Updates: title_emotion_vectors, title_transformation_scores,
--          title_intent_alignment_scores, title_social_summary
-- Timeout: 600s (10 minutes)
```

---

### 4.3 RLS Policy Status

| Table | RLS Enabled | Policies |
|-------|-------------|----------|
| user_roles | YES | Admin-only management |
| languages | YES | Anyone can view |
| phone_verifications | YES | Permissive (all ops allowed) |
| jobs | YES | Admins only |
| **users** | **NO** | **CRITICAL: All user data exposed** |
| **user_title_interactions** | **NO** | **User activity exposed** |
| **user_emotion_states** | **NO** | **Mood data exposed** |
| **friend_connections** | **NO** | **Social graph exposed** |
| **All others** | **NO** | No protection |

---

### 4.4 Enums Defined

```sql
CREATE TYPE app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE title_type_enum AS ENUM ('movie', 'tv');
CREATE TYPE provider_type_enum AS ENUM ('buy', 'rent', 'stream', 'free');
-- interaction_type: 'completed', 'liked', 'disliked', 'wishlisted'
-- rating_value: 'love_it', 'like_it', 'ok', 'dislike', 'hate'
```

---

### 4.5 Triggers

| Trigger | Table | Action |
|---------|-------|--------|
| trg_titles_set_updated_at | titles | Updates updated_at |
| viib_title_intent_stats_trigger | viib_intent_classified_titles | Refreshes intent stats |
| trigger_cascade_refresh_emotion_scores | viib_emotion_classified_titles | Refreshes emotion vectors |
| update_*_updated_at | Multiple | Standard timestamp updates |

---

## Part 5: Security Analysis

### 5.1 Critical Vulnerabilities

#### 1. Custom Authentication Bypassing Supabase Auth
**Location:** `src/contexts/AuthContext.tsx`
**Impact:** Complete authentication bypass possible

```typescript
// No JWT validation - just checks localStorage
const userId = localStorage.getItem('viib_user_id');
// Anyone can set this value in browser DevTools
```

#### 2. Hardcoded OTP in Production
**Location:** `supabase/functions/send-phone-otp/index.ts:91`
**Impact:** Anyone can log in with "111111"

#### 3. JWT Verification Disabled on All Edge Functions
**Location:** `supabase/config.toml`
**Impact:** All Edge Functions accessible without authentication

#### 4. Missing RLS on Sensitive Tables
**Impact:** Direct database access exposes all user data

---

### 5.2 High Priority Issues

| Issue | Location | Impact |
|-------|----------|--------|
| localStorage user ID trust | 12+ components | Impersonation possible |
| No rate limiting | All auth endpoints | Brute force attacks |
| No account lockout | verify-password | Credential stuffing |
| IP spoofing in geolocation | verify-email-otp:23-37 | Location bypass |
| Delete without ownership check | ManageTrustedCircleDialog:54 | Data deletion |
| SMTP password in plain state | EmailSetup.tsx | Credential exposure |

---

### 5.3 Medium Priority Issues

| Issue | Location | Impact |
|-------|----------|--------|
| JSON.parse without try-catch | AppRedirect.tsx:15 | Crash on bad data |
| Weak email/phone validation | RecommendTitleDialog | Invalid data accepted |
| Delete-then-insert pattern | SettingsModal.tsx | Data loss on failure |
| No CSP for iframes | TrailerDialog.tsx | XSS via YouTube |
| Console.error in production | 30+ files | Information leak |

---

## Part 6: Performance Analysis

### 6.1 Frontend Issues

| Issue | Location | Impact |
|-------|----------|--------|
| All users loaded client-side | Users.tsx | Memory/time with 10k+ users |
| All connections loaded | SocialGraph.tsx | Browser freeze with large graphs |
| Sorting on every render | Search.tsx:222-260 | Unnecessary CPU |
| IntersectionObserver recreation | Search.tsx:82 | Memory churn |
| 50 animated particles | Multiple screens | GPU drain |
| No React Query cache config | Global | Excessive API calls |
| No virtualization | Lists | Memory issues |

### 6.2 Backend Issues

| Issue | Location | Impact |
|-------|----------|--------|
| 5-second polling | CronMetricsDashboard | Unnecessary requests |
| 10-second polling | Jobs.tsx | Database load |
| O(n) friend similarity | viib_social_priority_score | Slow for social users |
| Sequential season processing | full-refresh-titles:679-745 | Slow syncs |
| No connection pooling | Edge Functions | Cold start latency |

### 6.3 Database Issues

| Issue | Location | Impact |
|-------|----------|--------|
| No partitioning | user_title_interactions | Slow queries at scale |
| Missing indexes | Several tables | Full table scans |
| 600s timeout on cache refresh | refresh_all_recommendation_caches | Long locks |
| Cascade triggers per row | emotion classification | Lock contention |

---

## Part 7: Code Quality

### 7.1 Positive Patterns

- TypeScript throughout (strict mode not enabled)
- Zod validation on forms
- React Query for data fetching
- Supabase client properly typed
- Component-based architecture
- Custom hooks for reusable logic
- Tailwind for consistent styling
- shadcn/ui for accessible components
- Framer Motion for smooth animations

### 7.2 Issues

| Category | Count | Examples |
|----------|-------|----------|
| console.log in production | 30+ files | Should use error logger |
| Type assertions (`as any`) | 15+ occurrences | Bypasses type safety |
| Hardcoded data | 10+ components | Should fetch from DB |
| Magic strings | 20+ occurrences | Should use enums/constants |
| Prop drilling | Onboarding flow | Should use context |
| No error boundaries | Global | Crashes propagate |
| No test files | 0 tests | Zero test coverage |

---

## Part 8: Feature Completeness

### 8.1 Implementation Status

| Feature | Status | Gaps |
|---------|--------|------|
| **Onboarding** | 90% | RecommendationReveal hardcoded, BiometricEnable stub |
| **Recommendation Engine** | 95% | Cold start handling weak |
| **Watchlist** | 100% | Complete |
| **Search** | 75% | Mood filters not wired |
| **Mood Tracking** | 95% | History view missing |
| **Social/Together** | 15% | Together empty, send-invites stub |
| **Admin Dashboard** | 92% | 2 placeholder components |
| **ViiB Lists** | 80% | Uses mock title data |
| **Email/SMS Invites** | 5% | Only logs, doesn't send |

### 8.2 Missing Features

1. **Together Feature** - 10 lines of placeholder
2. **Biometric Authentication** - UI only, no implementation
3. **Email/SMS Sending** - Edge functions are stubs
4. **Push Notifications** - Not implemented
5. **In-app Messaging** - No tables or UI
6. **Offline Support** - Not a PWA
7. **A/B Testing** - No framework
8. **Monetization** - No payment integration

---

## Part 9: Priority Recommendations

### P0 - Critical (Fix Immediately)

1. **Enable RLS** on all tables, especially `users`, `user_title_interactions`, `user_emotion_states`
2. **Remove hardcoded OTP** ("111111") in send-phone-otp
3. **Enable JWT verification** on all Edge Functions
4. **Implement proper authentication** using Supabase Auth
5. **Move credentials to environment variables**

### P1 - High Priority (This Week)

6. **Implement send-invites** email/SMS sending
7. **Add rate limiting** to authentication endpoints
8. **Fix RecommendationRevealScreen** to show personalized recommendations
9. **Wire mood filters** in search to backend
10. **Add cold-start recommendations** for new users
11. **Add integration tests** - Start with recommendation engine
12. **Remove console.log** statements from production

### P2 - Medium Priority (This Month)

13. **Implement Together feature**
14. **Add server-side pagination** for Users, ActivationCodes
15. **Optimize polling intervals** or use WebSocket
16. **Add error boundaries** to prevent crash propagation
17. **Implement biometric authentication**
18. **Add notification system**
19. **Pre-compute friend similarities**
20. **Add React Query cache configuration**

### P3 - Lower Priority (Next Quarter)

21. **Add A/B testing framework**
22. **Implement monetization**
23. **Add offline support (PWA)**
24. **Add accessibility audit and fixes**
25. **Implement ViiB Lists with real data**
26. **Add mood history view**
27. **Optimize animations** with `prefers-reduced-motion`
28. **Enable TypeScript strict mode**

---

## Appendix A: File Inventory

### Frontend (152 files)
- Pages: 17 files
- Components: 100+ files
- Hooks: 2 files
- Contexts: 1 file
- Services: 3 files
- Utils: 1 file

### Backend (130 files)
- Edge Functions: 20 files
- Migrations: 106 files
- Config: 4 files

### Total Lines Analyzed
- Frontend: ~25,000 lines
- Backend: ~25,000 lines
- **Total: ~50,000 lines**

---

## Appendix B: Technology Stack

### Frontend
- React 18.3.1
- TypeScript 5.8.3
- Vite 5.4.19
- TanStack React Query 5.56.2
- Framer Motion 11.11.7
- Three.js (for 3D effects)
- Tailwind CSS 3.4.14
- shadcn/ui components
- Recharts (admin charts)
- Zod (validation)

### Backend
- Supabase (PostgreSQL 15)
- Deno Edge Functions
- OpenAI GPT-4o-mini (classification)
- TMDB API (content)
- YouTube API (trailers)
- Supadata API (transcription)
- Gmail SMTP (emails)

---

*This review represents a complete file-by-file analysis of the ViiB codebase as of December 26, 2025.*
