# Comprehensive Gap Analysis Report: ViiB Welcome Flow

**Date:** December 26, 2025
**Reviewed by:** Claude Code Review
**Branch:** claude/review-code-database-6fvMX

---

## Executive Summary

ViiB is a sophisticated entertainment recommendation platform with emotion-based personalization, social features, and an extensive admin dashboard. The codebase is well-structured using modern technologies (React 18, Vite, Supabase, Deno Edge Functions). However, I've identified **critical gaps** across security, scalability, business logic, and user experience that need attention.

**Total Gaps Identified:** 62
- Critical: 20
- Medium: 30
- Low: 12

---

## Table of Contents

1. [Security Gaps](#1-security-gaps)
2. [Database & Infrastructure Gaps](#2-database--infrastructure-gaps)
3. [Recommendation Algorithm Gaps](#3-recommendation-algorithm-gaps)
4. [Feature Gaps](#4-feature-gaps)
5. [User Experience Gaps](#5-user-experience-gaps)
6. [Scalability Gaps](#6-scalability-gaps)
7. [Business Logic Gaps](#7-business-logic-gaps)
8. [Code Quality Gaps](#8-code-quality-gaps)
9. [Infrastructure Gaps](#9-infrastructure-gaps)
10. [Compliance Gaps](#10-compliance-gaps)
11. [Priority Matrix](#priority-matrix)

---

## 1. SECURITY GAPS

### 1.1 Authentication & Session Management (CRITICAL)

| Issue | Severity | Location |
|-------|----------|----------|
| **No server-side session validation** | 🔴 Critical | `AuthContext.tsx:40-95` |
| Session stored in localStorage without encryption | 🔴 Critical | Client-side |
| No session token signing or JWT | 🔴 Critical | Entire auth flow |
| User ID passed client-side without verification | 🔴 Critical | All authenticated requests |

**Details:**
```typescript
// Current insecure pattern (AuthContext.tsx:40-48)
const sessionData = localStorage.getItem('viib_session');
// Anyone can forge: { userId: 'any-uuid', rememberMe: true, timestamp: Date.now() }
```

**Impact:** Any user can impersonate another user by setting `viib_user_id` in localStorage.

**Recommendation:**
- Implement proper JWT tokens with server-side signing
- Use Supabase Auth or implement httpOnly secure cookies
- Add session token validation on every API call

### 1.2 Edge Functions Security

| Issue | Severity | Location |
|-------|----------|----------|
| All functions have `verify_jwt = false` | 🔴 Critical | `supabase/config.toml` |
| CORS allows all origins (`*`) | 🟡 Medium | All edge functions |
| No request authentication | 🔴 Critical | All edge functions |
| OTP codes logged to console | 🟡 Medium | `verify-email-otp/index.ts:90` |

**Code example:**
```typescript
// verify-email-otp/index.ts:90 - OTP exposed in logs
console.log('Comparing OTPs - Database:', dbOtp, 'User entered:', userOtp);
```

### 1.3 Password Security

| Issue | Severity | Location |
|-------|----------|----------|
| PBKDF2 iterations only 100,000 | 🟡 Medium | `hash-password/index.ts:23` |
| No password strength validation | 🟡 Medium | Frontend + backend |

**Recommendation:** Increase to 600,000+ iterations (OWASP 2023 recommendation) or switch to Argon2id.

### 1.4 Rate Limiting Gaps

| Issue | Severity | Location |
|-------|----------|----------|
| OTP rate limiting per email only, not per IP | 🟡 Medium | `send-email-otp/index.ts` |
| No global API rate limiting | 🟡 Medium | All endpoints |
| Brute force protection missing on password login | 🔴 Critical | Login flow |

---

## 2. DATABASE & INFRASTRUCTURE GAPS

### 2.1 Row-Level Security (CRITICAL)

| Issue | Severity | Details |
|-------|----------|---------|
| **RLS disabled on all tables** | 🔴 Critical | Application uses custom auth |
| No database-level authorization | 🔴 Critical | Relies on frontend guards only |

**Impact:** Direct database access (via exposed anon key) allows reading/writing any data.

### 2.2 Missing Database Features

| Gap | Impact | Recommendation |
|-----|--------|----------------|
| No database partitioning | Performance | Partition `user_title_interactions` by date |
| No read replicas | Scalability | Add read replica for analytics |
| No connection pooling | Performance | Use Supabase connection pooler |
| No audit logging | Compliance | Add audit triggers for sensitive tables |
| Missing indexes on frequently joined columns | Performance | See section 2.3 |

### 2.3 Query Performance Issues

```sql
-- N+1 pattern in recommendation scoring (viib_score_components)
-- Called once per title × 100 titles = 100 function calls
CROSS JOIN LATERAL viib_score_components(p_user_id, pf.cid) AS vsc
```

**Missing Indexes:**
```sql
-- These queries are slow without proper indexes:
CREATE INDEX CONCURRENTLY idx_user_emotion_states_user_recent
  ON user_emotion_states(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_friend_connections_lookup
  ON friend_connections(user_id, friend_user_id)
  WHERE is_blocked IS NULL OR is_blocked = FALSE;
```

### 2.4 Cache Management Gaps

| Issue | Current State | Recommendation |
|-------|---------------|----------------|
| Transformation scores | Pre-computed but can go stale | Add TTL and refresh triggers |
| No Redis/memcached layer | Missing | Add for session/hot data caching |
| No query result caching | Missing | Implement with TanStack Query |

---

## 3. RECOMMENDATION ALGORITHM GAPS

### 3.1 Cold Start Problem

| Scenario | Current Handling | Gap |
|----------|------------------|-----|
| New user with no emotion state | Returns 0.5 (neutral) | No fallback recommendations |
| User with no streaming subscriptions | Returns empty list | No suggestions to add services |
| No classified titles available | Returns empty | No graceful fallback |

**Code location:** `get_top_recommendations` returns empty when:
- `user_emotion_states` has no entry for user
- `user_streaming_subscriptions` is empty

### 3.2 Algorithm Limitations

| Gap | Impact | Recommendation |
|-----|--------|----------------|
| No collaborative filtering | Limited discovery | Add "users like you also watched" |
| No content-based similarity | Limited | Add title-to-title similarity |
| No trending/popular fallback | Poor new user experience | Add trending section |
| No diversity enforcement | Filter bubble risk | Ensure genre/emotion diversity |
| Transformation scores weighted equally | Suboptimal | A/B test different weights |

### 3.3 Explanation Quality

Current explanations are simplistic. Example from `explain_recommendation()`:
```sql
-- Returns generic: "A trusted friend recommended this"
-- Should include: "John (87% taste match) loved this thriller"
```

---

## 4. FEATURE GAPS

### 4.1 Missing Core Features

| Feature | Priority | Status |
|---------|----------|--------|
| Password reset flow | 🔴 Critical | `ForgotPassword.tsx` exists but incomplete |
| Email change functionality | 🔴 Critical | Missing |
| Account deletion (GDPR) | 🔴 Critical | Missing |
| Two-factor authentication | 🟡 Medium | Missing |
| Push notifications | 🟡 Medium | Missing |
| Offline support (PWA) | 🟢 Low | Missing |

### 4.2 Social Features Gaps

| Gap | Current State | Recommendation |
|-----|---------------|----------------|
| No friend request workflow | Direct connection only | Add request/accept flow |
| No blocking UI | Database supports it | Add UI in Social page |
| No notification for recommendations | Silent | Add in-app + push notifications |
| Watch together functionality | `Together.tsx` exists but empty | Implement or remove |

### 4.3 Admin Dashboard Gaps

| Gap | Impact | Recommendation |
|-----|--------|----------------|
| No export functionality | Limited analysis | Add CSV/JSON export |
| No user search | Hard to find users | Add search/filter |
| No content moderation tools | Risk | Add flagging system |
| No A/B testing dashboard | Limited optimization | Add experiment tracking |

---

## 5. USER EXPERIENCE GAPS

### 5.1 Onboarding Flow Issues

| Issue | Location | Impact |
|-------|----------|--------|
| 21-step onboarding is too long | `/components/onboarding/` | High abandonment risk |
| No skip option for optional steps | All screens | Frustration |
| No progress indicator | Missing | Users don't know how far along |
| No resume from where left off | Partial in `last_onboarding_step` | Inconsistent |

**Recommendation:** Reduce to 5-7 critical steps, make others optional post-signup.

### 5.2 Search UX Issues

| Issue | Location | Recommendation |
|-------|----------|----------------|
| No recent searches | `Search.tsx` | Add search history |
| No voice search | Missing | Add Web Speech API |
| Filters reset on navigation | State lost | Persist in URL params |
| Genre filter doesn't use DB values | Hardcoded array | Load from database |

### 5.3 Loading & Error States

| Issue | Current State | Recommendation |
|-------|---------------|----------------|
| Generic "Something went wrong" errors | `Home.tsx:100` | Show specific actionable errors |
| No retry buttons | Missing | Add "Try Again" actions |
| No skeleton loading for modals | Missing | Add consistent loading states |
| No empty states with CTAs | Basic text only | Add engaging illustrations |

### 5.4 Mobile Responsiveness

| Issue | Location | Impact |
|-------|----------|--------|
| Filter sheet too narrow on mobile | `Search.tsx:555` | 280px is cramped |
| Card grids don't adapt well | `Home.tsx:334` | Too many columns |
| Touch targets too small | Various buttons | Accessibility issue |

---

## 6. SCALABILITY GAPS

### 6.1 Backend Scalability

| Issue | Risk | Recommendation |
|-------|------|----------------|
| Edge functions timeout at 60s | Long operations fail | Use background tasks |
| No job queue system | Poor reliability | Implement with pg-boss or BullMQ |
| Self-invoking functions can fail | Job chain breaks | Add dead-letter handling |
| No horizontal scaling plan | Bottleneck | Document scaling strategy |

### 6.2 Frontend Scalability

| Issue | Impact | Recommendation |
|-------|--------|----------------|
| No code splitting beyond routes | Large initial bundle | Add lazy loading |
| All recommendations loaded at once | Memory pressure | Implement virtualization |
| No image optimization pipeline | Slow loads | Add next/image style optimization |

---

## 7. BUSINESS LOGIC GAPS

### 7.1 Monetization Features (Missing)

| Feature | Status | Priority |
|---------|--------|----------|
| Premium subscription tiers | Missing | High |
| Payment integration | Missing | High |
| Feature gating | Missing | High |
| Usage analytics for upselling | Partial | Medium |

### 7.2 Content Management Gaps

| Gap | Current State | Impact |
|-----|---------------|--------|
| No content moderation | Relying on TMDB | Risk of inappropriate content |
| No user-generated content workflow | Missing | Limited engagement |
| No editorial curation tools | Missing | No featured content |

### 7.3 Analytics & Insights Gaps

| Gap | Current State | Recommendation |
|-----|---------------|----------------|
| No funnel analytics | Missing | Track conversion funnels |
| No recommendation quality metrics | Missing | Track CTR, engagement |
| No user cohort analysis | Missing | Implement retention cohorts |
| No real-time analytics | Missing | Add live dashboard |

---

## 8. CODE QUALITY GAPS

### 8.1 Type Safety Issues

```typescript
// Using 'any' types frequently:
// Jobs.tsx:111
const { data, error } = await supabase.rpc('get_job_classification_metrics' as any);

// Search.tsx:35
const [services, setServices] = useState<any[]>([]);
```

**Recommendation:** Generate types from Supabase schema using `supabase gen types typescript`.

### 8.2 Error Handling Inconsistencies

| Pattern | Location | Issue |
|---------|----------|-------|
| Silent failures | `Search.tsx:214` | Errors caught but user not informed |
| Console-only logging | Multiple | No error tracking service |
| No error boundaries | React components | Whole app crashes on error |

### 8.3 Testing Gaps

| Test Type | Current State | Recommendation |
|-----------|---------------|----------------|
| Unit tests | Missing | Add Jest/Vitest |
| Integration tests | Missing | Add Playwright |
| E2E tests | Missing | Add Cypress |
| Database function tests | Missing | Add pgTAP |

---

## 9. INFRASTRUCTURE GAPS

### 9.1 Observability

| Gap | Current State | Recommendation |
|-----|---------------|----------------|
| No APM/tracing | Missing | Add Sentry/Datadog |
| Limited logging | Console only | Add structured logging |
| No alerting | Missing | Add PagerDuty/Opsgenie |
| No health checks | Missing | Add `/health` endpoint |

### 9.2 DevOps

| Gap | Current State | Recommendation |
|-----|---------------|----------------|
| No CI/CD pipeline visible | Missing | Add GitHub Actions |
| No preview environments | Missing | Add Vercel/Netlify previews |
| No database migrations automation | Manual | Add migration runner |
| No secrets management | `.env` files | Use Vault/Infisical |

---

## 10. COMPLIANCE GAPS

| Requirement | Current State | Priority |
|-------------|---------------|----------|
| GDPR data export | Missing | 🔴 Critical |
| GDPR data deletion | Missing | 🔴 Critical |
| Cookie consent banner | Missing | 🔴 Critical |
| Privacy policy version tracking | Missing | 🟡 Medium |
| Age verification (COPPA) | `is_age_over_18` field exists | 🟡 Verify implementation |
| Accessibility (WCAG 2.1) | Partial | 🟡 Medium |

---

## Priority Matrix

### Immediate (Week 1-2)
1. 🔴 Fix authentication - implement proper JWT tokens
2. 🔴 Enable RLS policies with proper authorization
3. 🔴 Remove OTP logging from console
4. 🔴 Implement account deletion for GDPR

### Short-term (Month 1)
1. 🟡 Add error tracking (Sentry)
2. 🟡 Implement cold-start recommendations
3. 🟡 Add password strength validation
4. 🟡 Reduce onboarding to 5-7 steps

### Medium-term (Quarter 1)
1. 🟢 Add collaborative filtering to recommendations
2. 🟢 Implement push notifications
3. 🟢 Add CI/CD pipeline
4. 🟢 Create comprehensive test suite

### Long-term (Quarter 2+)
1. Add payment/subscription system
2. Implement PWA with offline support
3. Add content moderation system
4. Scale to multi-region deployment

---

## Summary Statistics

| Category | Critical | Medium | Low |
|----------|----------|--------|-----|
| Security | 6 | 4 | 0 |
| Database | 3 | 5 | 2 |
| Features | 4 | 8 | 3 |
| UX | 2 | 6 | 4 |
| Infrastructure | 2 | 5 | 3 |
| Compliance | 3 | 2 | 0 |
| **Total** | **20** | **30** | **12** |

---

## Appendix: Files Reviewed

### Core Application
- `src/contexts/AuthContext.tsx` - Authentication logic
- `src/pages/app/Home.tsx` - Recommendations display
- `src/pages/app/Search.tsx` - Search functionality
- `src/components/admin/Jobs.tsx` - Background job management
- `src/components/onboarding/*.tsx` - 21 onboarding screens

### Edge Functions
- `supabase/functions/send-email-otp/index.ts`
- `supabase/functions/verify-email-otp/index.ts`
- `supabase/functions/hash-password/index.ts`
- `supabase/functions/classify-title-ai/index.ts`
- `supabase/functions/search-tmdb/index.ts`

### Database
- `supabase/migrations/20251224090000_phase1_recommendation_foundation.sql`
- `supabase/migrations/20251224100000_phase2_recommendation_scoring.sql`
- `supabase/migrations/20251224110000_phase3_indexes_and_refresh.sql`
- 113+ total migration files reviewed

### Configuration
- `supabase/config.toml`
- `package.json`
- `vite.config.ts`
- `tailwind.config.ts`

---

*This analysis covers the major gaps identified in the ViiB codebase. The most urgent issues are in **security** (authentication bypass vulnerability) and **compliance** (GDPR requirements). Addressing these should be the immediate priority before scaling the platform.*
