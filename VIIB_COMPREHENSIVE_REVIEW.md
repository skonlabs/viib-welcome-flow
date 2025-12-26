# ViiB Comprehensive Codebase Review

**Date:** December 26, 2025
**Scope:** Full codebase including all features, database, Edge Functions, and business logic

---

## Executive Summary

ViiB is a mood-based entertainment recommendation platform with a sophisticated emotion-aware recommendation engine. After a thorough review of every major feature, I've identified the complete state of implementation across all areas.

### Overall Assessment

| Category | Implementation | Quality | Notes |
|----------|---------------|---------|-------|
| **Onboarding** | 95% | B+ | 21 components, impressive UX, some hardcoded data |
| **Recommendation Engine** | 85% | A- | Sophisticated PAD model, needs cold-start handling |
| **Watchlist** | 100% | A | Fully functional with seasons support |
| **Search** | 90% | B+ | TMDB integration, mood filters not wired |
| **Mood Tracking** | 95% | A | 2D interactive map, elegant implementation |
| **Social Features** | 50% | C | Email/SMS not implemented, Together is placeholder |
| **Admin Dashboard** | 90% | A | 22/24 components complete, 2 placeholders |
| **Edge Functions** | 75% | B | 20 functions, some with TODO stubs |
| **Database** | 90% | A- | 50+ tables, complex relationships |
| **Security** | 60% | C- | Missing RLS, JWT disabled on functions |
| **Testing** | 0% | F | No tests exist |

---

## Part 1: Feature-by-Feature Analysis

### 1.1 Onboarding Flow (21 Components)

**Location:** `src/components/onboarding/`

#### Screens Implemented:
1. **WelcomeScreen** - 3D parallax effects, animated gradients
2. **EntryMethodScreen** - Email/Phone selection (Apple mentioned but not implemented)
3. **EmailSignupScreen** - Zod validation, password strength indicator
4. **PhoneEntryScreen** - 3 countries only (US, UK, India)
5. **OTPVerificationBase** - 6-digit, auto-advance, paste support
6. **EmailOTPVerificationScreen** - Email verification wrapper
7. **OTPVerificationScreen** - Phone verification wrapper
8. **UserIdentityScreen** - Name + 4 vibes (calm, energetic, curious, adventure)
9. **LanguageSelectionScreen** - Multi-select from DB, priority ordering
10. **StreamingPlatformsScreen** - Multi-select, logo URLs fetched but not displayed
11. **MoodCalibrationScreen** - Emotion carousel + energy slider
12. **VisualTasteScreen** - 6 hardcoded posters with emoji placeholders
13. **VisualDNARevealScreen** - Shows 3 selections, decorative DNA animation
14. **RecommendationRevealScreen** - **HARDCODED** - Same 3 titles for everyone
15. **BiometricEnableScreen** - **PLACEHOLDER** - No actual biometric setup
16. **SocialConnectionScreen** - Invite flow via email/phone/link
17. **CompanionIntroScreen** - AI companion marketing screen
18. **FeedbackCaptureScreen** - 4 reaction buttons, **feedback not persisted**
19. **CompletionScreen** - Confetti celebration

#### Critical Issues:
- **RecommendationRevealScreen** shows hardcoded titles, not personalized
- **BiometricEnableScreen** has no implementation (UI only)
- **VisualTasteScreen** uses emoji placeholders instead of real images
- **FeedbackCaptureScreen** captures feedback but doesn't save to database
- No progress indicator across 17-step flow
- Heavy animations may impact performance on low-end devices
- `console.log` statements throughout (30+ occurrences)

#### Data Collection:
| Field | Validated | Persisted | Used in Recommendations |
|-------|-----------|-----------|------------------------|
| Email | Yes (Zod) | Yes | No |
| Password | Yes (strength) | Yes | No |
| Phone | Partial (length only) | Yes | No |
| Name | No validation | Unclear | Display only |
| Vibe | Enum | Unclear | Not visible |
| Languages | From DB | Yes | Yes (filtering) |
| Platforms | From DB | Yes | Yes (availability) |
| Mood/Energy | Range checked | Yes | Yes (scoring) |
| Visual Taste | Array | Unclear | Not visible |

---

### 1.2 Recommendation Engine

**Location:** Database functions + `src/pages/app/Home.tsx`

#### Algorithm Overview:

The ViiB recommendation engine uses a **5-component weighted scoring system**:

```
Final Score = MAX(
  Base Score × Intent Alignment,
  Social Priority Score
)

Base Score =
  Emotional (35%) + Social (20%) + Historical (25%) + Context (10%) + Novelty (10%)
```

#### Component Breakdown:

**1. Emotional Component (35%)**
- Calculates cosine similarity between user's PAD vector and title's emotion vector
- Uses transformation scores to measure how content transforms user's emotional state
- 7 transformation types: amplify, complementary, soothe, validate, reinforcing, neutral_balancing, stabilize
- Weights transformation more heavily when user is in negative emotional state

**2. Social Component (20%)**
- Friend ratings weighted by trust score (0-1)
- Direct friend recommendations bonus
- `calculate_taste_similarity()` computes overlap in positive ratings

**3. Historical Component (25%)**
- Time-decay function: `exp(-days_since_interaction / 180)`
- Wishlisted items get 0.6 score
- Completed + liked items get decayed score

**4. Context Component (10%)**
- Compares title runtime to user's average session length
- Difference ratio determines score

**5. Novelty Component (10%)**
- 1.0 for unseen titles
- 0.3 for previously interacted titles

#### Key Functions:
- `get_top_recommendations_v2()` - Main recommendation function
- `viib_score_components()` - Calculates 5 components
- `viib_intent_alignment_score()` - Maps emotions to viewing intents
- `viib_social_priority_score()` - Friend recommendation priority
- `explain_recommendation()` - Human-readable explanation

#### Gaps Identified:
1. **Cold Start Problem**: New users with no emotion state get generic popular titles
2. **No Diversity Enforcement**: Could return 10 similar titles
3. **Static Intent Weights**: Emotion→Intent mappings never learn from user behavior
4. **O(n) Social Scoring**: Similarity recalculated per friend per title
5. **No A/B Testing**: All users see same weights
6. **Binary Novelty**: No time-decay for "watched 2 years ago" vs "yesterday"
7. **Missing Multi-hop Transformations**: sad→comforting→happy not supported

---

### 1.3 Watchlist Feature

**Location:** `src/pages/app/Watchlist.tsx`

#### Implementation Status: **COMPLETE**

**Tabs:**
1. **To Watch** - Wishlisted titles with season support
2. **Watched** - Completed titles with ratings
3. **Recommended** - Social recommendations from friends

**Features:**
- Full CRUD for watchlist items
- Season-level tracking for TV series
- Rating integration (love_it, like_it, ok, dislike_it)
- Sorting by date, alphabetical, rating
- Move between tabs (watchlist ↔ watched)
- Delete confirmation dialogs
- Recommend to friends dialog
- Statistics dashboard (total watch time, avg rating)

**Data Flow:**
```typescript
// Fetches wishlisted/completed interactions
const { data: interactions } = await supabase
  .from('user_title_interactions')
  .select('id, title_id, season_number, created_at, rating_value')
  .eq('user_id', user.id)
  .eq('interaction_type', status === 'pending' ? 'wishlisted' : 'completed')
```

---

### 1.4 Search Feature

**Location:** `src/pages/app/Search.tsx` + `supabase/functions/search-tmdb/`

#### Implementation Status: **MOSTLY COMPLETE**

**Features Implemented:**
- Text search with autocomplete (300ms debounce)
- Genre filters (10 hardcoded genres)
- Year filters (last 10 years)
- Streaming service filters (from user subscriptions)
- Mood/emotion filters (from database)
- Infinite scroll pagination
- Results sorted by: release date → language match → streaming availability → popularity

**Edge Function (`search-tmdb`):**
- Searches both movies and TV shows via TMDB API
- Fetches certifications, streaming providers, runtime
- Returns enriched title objects with availability

**Gap: Mood Filters Not Wired**
```typescript
// selectedMoods state exists but is never used in search
const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
// moodIntensity slider exists but not sent to backend
const [moodIntensity, setMoodIntensity] = useState<number>(0.5);
```

---

### 1.5 Mood Tracking

**Location:** `src/pages/app/Mood.tsx` + `src/components/mood/MoodMap.tsx`

#### Implementation Status: **COMPLETE**

**Features:**
- 2D interactive mood map (Valence × Arousal)
- Touch and mouse drag support
- Visual position marker with color gradient
- Emotion reference dots from database
- Quadrant-based mood labels (16 zones)
- Saves via `translate_mood_to_emotion` RPC
- Dispatches `viib-mood-changed` event to refresh Home recommendations

**PAD Model Mapping:**
```typescript
// Position (0-100) to Valence/Arousal (-1 to 1)
const positionToEmotion = (x, y) => ({
  valence: (x / 100) * 2 - 1,
  arousal: 1 - (y / 100) * 2,
});
```

---

### 1.6 Social Features

**Location:** `src/pages/app/Social.tsx`, `src/pages/app/Together.tsx`

#### Implementation Status: **PARTIAL (50%)**

**Implemented:**
- Friend connections list
- Friend request accept/reject
- Send recommendations to friends
- ViiB Lists (create, share, follow)
- Social graph visualization (admin)

**Placeholder/Incomplete:**

1. **Together Feature** - **10 lines of code, completely empty**
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

2. **Email/SMS Invites** - Edge function logs but doesn't send
```typescript
// send-invites/index.ts line 120-127
async function sendEmailInvite(...): Promise<boolean> {
  console.log(`[EMAIL INVITE] To: ${email}...`);
  // TODO: Implement actual email sending using Resend or Gmail SMTP
  return true;
}
```

3. **Trusted Circle Management** - Can only remove, not add users

4. **In-app Messaging** - No tables or UI exist

5. **Notifications** - No notification system

---

### 1.7 Admin Dashboard

**Location:** `src/components/admin/`

#### Implementation Status: **22/24 COMPLETE**

**Fully Implemented (22):**
| Component | Purpose | Real-time |
|-----------|---------|-----------|
| Users | Full CRUD, search, filters | No |
| ActivationCodes | Generate, email, track usage | No |
| Sessions | Session analytics | No |
| Jobs | Job execution, progress tracking | Yes (5s) |
| ThreadMonitor | Parallel job visualization | Yes (5s) |
| CronMetricsDashboard | Materialization progress | Yes (5s) |
| SystemLogs | Error logs with resolution | No |
| RateLimiting | Rate limit CRUD | No |
| EmailSetup | SMTP configuration | No |
| EmailTemplates | Template CRUD | No |
| ActiveUsers | DAU/WAU/MAU metrics | No |
| SocialActivity | Connection metrics | No |
| Recommendations | Acceptance rates | No |
| TitleWatch | Watchlist analytics | No |
| UserRetention | D1/D7/D30 retention | No |
| PassRate | Pass vs Add ratio | No |
| MoodUsage | Mood feature adoption | No |
| SocialGraph | Interactive network viz | No |
| Feedback | Feedback status workflow | No |
| Bugs | Bug tracking | No |
| FeatureRequests | Feature requests | No |
| SupportRequests | Support tickets | No |

**Placeholder Only (2):**
- **ContentEngine** - Shows "Edge functions required" message
- **ViibScoreCalculator** - Shows "Edge functions required" message

---

### 1.8 ViiB Lists Feature

**Location:** `src/pages/app/ViiBList.tsx`

#### Implementation Status: **COMPLETE**

**Features:**
- Create lists with name, description, mood tags
- Visibility options: Private, Trusted Circle, Public
- Add/remove titles from lists
- Follow/unfollow public lists
- View count tracking
- Share via link

**Tables:**
- `vibe_lists` - List metadata
- `vibe_list_items` - Titles in lists
- `vibe_list_followers` - Users following lists
- `vibe_list_shared_with` - Trusted circle shares
- `vibe_list_views` - View tracking

---

## Part 2: Database Analysis

### 2.1 Schema Overview

**Total Tables:** 50+
**Total Functions:** 30+
**Total Enums:** 18
**Migrations:** 100+

### 2.2 Core Tables

| Category | Tables |
|----------|--------|
| **Users** | users, user_roles, personality_profiles |
| **Titles** | titles, seasons, episodes, title_genres, genres, keywords |
| **Emotions** | emotion_master, emotion_display_phrases, emotion_to_intent_map, emotion_transformation_map |
| **Classification** | viib_emotion_classified_titles, viib_intent_classified_titles, title_emotion_vectors |
| **Scoring** | title_transformation_scores, title_intent_alignment_scores, title_social_summary, title_user_emotion_match_cache |
| **Interactions** | user_title_interactions, user_emotion_states, recommendation_outcomes |
| **Social** | friend_connections, user_social_recommendations, vibe_lists, vibe_list_* |
| **System** | jobs, system_logs, rate_limit_config, email_config, email_templates, activation_codes |
| **Streaming** | streaming_services, title_streaming_availability, user_streaming_subscriptions |

### 2.3 Key Database Functions

| Function | Purpose | Timeout |
|----------|---------|---------|
| `get_top_recommendations_v2` | Main recommendation engine | 30s |
| `viib_score_components` | Calculate 5 scoring components | None |
| `refresh_all_recommendation_caches` | Master cache refresh | 600s |
| `explain_recommendation` | Human-readable explanation | None |
| `translate_mood_to_emotion` | Mood→Emotion mapping | None |
| `calculate_taste_similarity` | Friend taste overlap | None |

### 2.4 Missing Database Features

1. **No soft deletes** (`deleted_at` column) on any table
2. **No partitioning** on high-volume tables (`user_title_interactions`)
3. **No archival strategy** for temporal data (`user_emotion_states`)
4. **Schema mismatch**: `title_social_summary` has different columns than referenced in code

---

## Part 3: Edge Functions Analysis

### 3.1 Edge Functions Inventory (20 Total)

| Function | Purpose | Status |
|----------|---------|--------|
| **classify-title-ai** | AI emotion/intent classification | Complete |
| **full-refresh-orchestrator** | Batch job coordinator | Complete |
| **full-refresh-titles** | TMDB sync | Complete |
| **sync-titles-delta** | Incremental sync | Complete |
| **enrich-title-details** | Fetch metadata | Complete |
| **enrich-title-details-batch** | Batch metadata | Complete |
| **enrich-title-trailers** | Trailer URLs | Complete |
| **transcribe-trailers** | Audio transcription | Complete |
| **promote-title-ai** | AI promotion | Complete |
| **search-tmdb** | TMDB search | Complete |
| **fix-streaming-availability** | Streaming updates | Complete |
| **get-analytics** | Analytics export | Complete |
| **send-email-otp** | Email OTP | Complete |
| **send-phone-otp** | Phone OTP | Complete |
| **verify-email-otp** | Verify email | Complete |
| **verify-phone-otp** | Verify phone | Complete |
| **hash-password** | Password hashing | Complete |
| **verify-password** | Password verify | Complete |
| **send-activation-invite** | Activation emails | Complete |
| **send-invites** | Friend invites | **STUB ONLY** |

### 3.2 Critical: send-invites is Not Implemented

```typescript
// Lines 113-127 of send-invites/index.ts
async function sendEmailInvite(email, senderName, inviteLink, note) {
  console.log(`[EMAIL INVITE] To: ${email}...`);
  // TODO: Implement actual email sending using Resend or Gmail SMTP
  return true; // Returns success without sending
}

async function sendSMSInvite(phone, senderName, inviteLink, note) {
  console.log(`[SMS INVITE] To: ${phone}...`);
  // TODO: Implement actual SMS sending using Twilio
  return true; // Returns success without sending
}
```

### 3.3 Security Issue: JWT Verification Disabled

All Edge Functions have `verify_jwt = false` in `supabase/config.toml`:
```toml
[functions.classify-title-ai]
verify_jwt = false
```

This means any request to Edge Functions bypasses authentication.

---

## Part 4: Security Analysis

### 4.1 RLS Policy Status

| Table | RLS Enabled | Policies |
|-------|-------------|----------|
| user_roles | Yes | 5 policies (view own, admin CRUD) |
| users | **NO** | **CRITICAL: All user data exposed** |
| user_title_interactions | **NO** | **CRITICAL: User activity exposed** |
| user_emotion_states | **NO** | **User mood data exposed** |
| friend_connections | **NO** | **Social graph exposed** |
| titles | **NO** | Public read OK, but no admin-only write |
| feedback | **NO** | User feedback exposed |
| All others | **NO** | No RLS on any table |

### 4.2 Authentication Issues

1. **Password stored in localStorage**: User ID stored client-side
2. **No password reset flow**: `ForgotPassword.tsx` exists but incomplete
3. **No session timeout**: Sessions persist indefinitely
4. **No OTP attempt limiting**: Can retry OTP verification infinitely
5. **No 2FA option**: Only OTP during signup, not for login

---

## Part 5: Performance Analysis

### 5.1 Frontend Issues

| Issue | Location | Impact |
|-------|----------|--------|
| No React Query caching config | Global | Excessive API calls |
| 50+ particles per screen | FloatingParticles.tsx | GPU drain |
| 40+ animated elements | UserIdentityScreen.tsx | Frame drops |
| Three.js on initial load | Onboarding | Large bundle |
| No virtualization | Lists | Memory issues |
| 30+ console.log statements | Various | Production noise |

### 5.2 Database Issues

| Issue | Location | Impact |
|-------|----------|--------|
| 60s timeout on recommendations | get_top_recommendations | May timeout |
| O(n) friend similarity | viib_social_priority_score | Slow for social users |
| No indexes on common queries | Multiple tables | Slow queries |
| Cascade trigger per row | emotion classification | Lock contention |

---

## Part 6: Code Quality

### 6.1 Positive Patterns

- TypeScript throughout
- Zod validation on forms
- React Query for data fetching
- Supabase client properly typed
- Component-based architecture
- Custom hooks for reusable logic
- Tailwind for consistent styling
- shadcn/ui for accessible components

### 6.2 Issues

- No test files exist
- console.log in production (30+ files)
- Hardcoded data in UI components
- Prop drilling in onboarding
- No error boundaries
- Inconsistent error logging (console vs errorLogger)
- Magic strings for interaction types
- No TypeScript strict mode

---

## Part 7: Business Logic Gaps

### 7.1 Monetization (Not Implemented)

- No subscription tiers
- No payment integration
- No premium features
- No ad infrastructure

### 7.2 Engagement (Partial)

- No push notifications
- No email campaigns
- No re-engagement flows
- No gamification

### 7.3 Analytics (Partial)

- Admin dashboard exists
- No cohort analysis
- No funnel tracking
- No A/B testing framework
- No recommendation quality metrics

---

## Part 8: Priority Recommendations

### Immediate (P0)

1. **Enable RLS** on all tables, especially `users`, `user_title_interactions`
2. **Enable JWT verification** on Edge Functions
3. **Implement send-invites** email/SMS sending (currently logs only)
4. **Add tests** - Start with recommendation engine
5. **Remove console.log** statements from production

### High Priority (P1)

6. **Implement Together feature** (currently placeholder)
7. **Fix RecommendationRevealScreen** to show personalized recommendations
8. **Add progress indicator** to onboarding
9. **Wire mood filters** in search to backend
10. **Add cold-start recommendations** for new users

### Medium Priority (P2)

11. **Optimize animations** - Reduce particle counts, use `prefers-reduced-motion`
12. **Add React Query cache config**
13. **Implement biometric authentication**
14. **Add notification system**
15. **Pre-compute friend similarities**

### Lower Priority (P3)

16. **Add A/B testing framework**
17. **Implement monetization**
18. **Add offline support (PWA)**
19. **Implement real-time features**
20. **Add accessibility audit**

---

## Appendix: Files Reviewed

### Frontend (200+ files)
- All pages in `src/pages/`
- All components in `src/components/`
- All hooks in `src/hooks/`
- All contexts in `src/contexts/`
- All services in `src/lib/services/`

### Backend (120+ files)
- All migrations in `supabase/migrations/`
- All Edge Functions in `supabase/functions/`
- Database types in `src/integrations/supabase/types.ts`

### Configuration
- `package.json`, `tsconfig.json`, `vite.config.ts`
- `tailwind.config.ts`, `supabase/config.toml`

---

*This review represents a complete analysis of the ViiB codebase as of December 26, 2025.*
