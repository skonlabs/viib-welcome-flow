# ViiB Codebase Gap Analysis Report

**Date:** December 26, 2025
**Version:** 1.0
**Reviewed by:** Expert Web App Developer, UX Reviewer, and Business Developer

---

## Executive Summary

ViiB is a sophisticated mood-based entertainment recommendation platform with a solid foundation. However, there are significant gaps that need to be addressed to make it an exceptional, production-ready application. This report identifies **72 specific gaps** across 10 categories with prioritized recommendations.

---

## Table of Contents

1. [Testing Infrastructure](#1-testing-infrastructure)
2. [Database & Schema](#2-database--schema)
3. [Security & Authorization](#3-security--authorization)
4. [Performance & Scalability](#4-performance--scalability)
5. [Error Handling & Observability](#5-error-handling--observability)
6. [Frontend Architecture](#6-frontend-architecture)
7. [Backend & Edge Functions](#7-backend--edge-functions)
8. [User Experience](#8-user-experience)
9. [Business & Feature Gaps](#9-business--feature-gaps)
10. [DevOps & Infrastructure](#10-devops--infrastructure)

---

## 1. Testing Infrastructure

### Critical Gap: No Test Coverage

**Current State:** Zero test files found in the repository (`**/*.test.{ts,tsx}` returns no results)

| Gap ID | Description | Priority | Impact |
|--------|-------------|----------|--------|
| T-001 | No unit tests for React components | Critical | High regression risk |
| T-002 | No unit tests for custom hooks (`useAuth`, `useTitleActions`, `useAnalytics`) | Critical | Core functionality untested |
| T-003 | No integration tests for Supabase RPC functions | Critical | Database logic untested |
| T-004 | No E2E tests for critical user flows (onboarding, authentication) | High | User journeys untested |
| T-005 | No Edge Function tests | High | Backend logic untested |
| T-006 | No test configuration (`vitest.config.ts`, `jest.config.js`) | Critical | Testing infrastructure missing |
| T-007 | No CI/CD pipeline for automated testing | High | No automated quality gates |
| T-008 | No visual regression testing for UI components | Medium | UI changes untracked |

### Recommendations

```typescript
// Suggested test stack:
// - Vitest for unit tests
// - React Testing Library for component tests
// - Playwright for E2E
// - MSW for API mocking
```

---

## 2. Database & Schema

### Schema Gaps

| Gap ID | Description | Priority | Impact |
|--------|-------------|----------|--------|
| D-001 | Missing `updated_at` column on `users` table | Medium | No audit trail for user updates |
| D-002 | No `deleted_at` soft delete column on critical tables | Medium | No data recovery capability |
| D-003 | `title_social_summary` schema mismatch - has `avg_rating/rating_count/recommendation_count` but referenced as `social_mean_rating/social_rec_power` | High | Potential runtime errors |
| D-004 | No partitioning strategy for `user_title_interactions` (will grow unbounded) | High | Performance degradation |
| D-005 | No archival strategy for `user_emotion_states` (temporal data) | Medium | Storage bloat |
| D-006 | Missing composite indexes on frequently queried columns in `viib_emotion_classified_titles` | High | Slow classification queries |
| D-007 | No database views for common complex queries | Medium | Repeated complex SQL |
| D-008 | `jobs` table lacks `retry_count` and `max_retries` columns | Medium | No retry policy tracking |

### Missing Tables (Business Requirements)

| Gap ID | Description | Priority | Business Impact |
|--------|-------------|----------|-----------------|
| D-009 | No `user_preferences` table for app settings | Medium | Settings scattered/missing |
| D-010 | No `notifications` table for push/in-app notifications | High | No notification system |
| D-011 | No `user_activity_log` for analytics/auditing | Medium | Limited user analytics |
| D-012 | No `content_reports` for user-generated content moderation | Medium | No content flagging |
| D-013 | No `user_devices` for multi-device session management | Low | Single-device assumption |

### Index Gaps (Performance)

| Gap ID | Description | Current Query Pattern |
|--------|-------------|----------------------|
| D-014 | Missing index on `titles(original_language)` | Language-based filtering |
| D-015 | Missing index on `titles(classification_status)` | Classification job queries |
| D-016 | Missing index on `user_emotion_states(user_id, created_at DESC)` | Latest emotion lookup |
| D-017 | Missing index on `viib_intent_classified_titles(title_id, intent_type)` | Intent alignment score |

---

## 3. Security & Authorization

### RLS Policy Gaps

**Current State:** Only `user_roles` table has comprehensive RLS policies. Other tables lack proper RLS.

| Gap ID | Table | Missing Policy | Risk Level |
|--------|-------|---------------|------------|
| S-001 | `users` | No RLS - users can read/write all user data | Critical |
| S-002 | `user_title_interactions` | Missing user-scoped policies | Critical |
| S-003 | `user_emotion_states` | No RLS - emotion data exposed | High |
| S-004 | `friend_connections` | Missing bi-directional access control | High |
| S-005 | `user_social_recommendations` | No sender/receiver validation | High |
| S-006 | `vibe_lists` | Visibility column exists but no RLS | Medium |
| S-007 | `feedback` | No user ownership validation | Medium |
| S-008 | `titles` | Public read OK, but needs admin-only write | Medium |

### Authentication Gaps

| Gap ID | Description | Priority |
|--------|-------------|----------|
| S-009 | Password stored in `users.password_hash` but no password policy enforcement | High |
| S-010 | No password reset flow in UI (only `ForgotPassword.tsx` placeholder) | High |
| S-011 | No session timeout configuration | Medium |
| S-012 | No login rate limiting on frontend | High |
| S-013 | OTP codes have no attempt limit tracking | High |
| S-014 | No 2FA/MFA option for security-conscious users | Medium |

### Edge Function Security

| Gap ID | Description | Risk |
|--------|-------------|------|
| S-015 | All Edge Functions have `verify_jwt = false` in config.toml | High - No auth on functions |
| S-016 | No input validation on `classify-title-ai` request body | Medium |
| S-017 | OpenAI API key exposed to function without rate limiting | Medium |
| S-018 | Service role key used directly without scoped permissions | Medium |

---

## 4. Performance & Scalability

### Frontend Performance

| Gap ID | Description | Impact |
|--------|-------------|--------|
| P-001 | No React Query cache configuration (staleTime, cacheTime) | Excessive API calls |
| P-002 | No data prefetching strategy | Slow navigation |
| P-003 | No virtualization for long lists (recommendations, watchlist) | UI lag with many items |
| P-004 | No image lazy loading configuration | Slow initial load |
| P-005 | No code splitting beyond route-level | Large bundle size |
| P-006 | Three.js loaded on initial page load | Heavy initial bundle |
| P-007 | No skeleton screens for data loading states in all components | Poor perceived performance |

### Database Performance

| Gap ID | Description | Current State |
|--------|-------------|--------------|
| P-008 | `get_top_recommendations` has 60s timeout | May timeout with large datasets |
| P-009 | No connection pooling configuration visible | Potential connection exhaustion |
| P-010 | `refresh_all_recommendation_caches` is synchronous | Blocks during refresh |
| P-011 | No materialized views for complex aggregations | Slow dashboard queries |
| P-012 | `title_user_emotion_match_cache` refresh is O(titles * emotions) | Quadratic scaling |

### Scalability Concerns

| Gap ID | Description | Threshold Concern |
|--------|-------------|-------------------|
| P-013 | `full-refresh-orchestrator` processes all titles sequentially | >100K titles |
| P-014 | No sharding strategy for high-write tables | >10M interactions |
| P-015 | Self-invoking Edge Functions create recursion depth issues | >1000 batches |
| P-016 | No CDN configuration for static assets | Global users |

---

## 5. Error Handling & Observability

### Error Handling Gaps

| Gap ID | Description | Location |
|--------|-------------|----------|
| E-001 | `ErrorLoggerService` only logs to console + DB, no alerting | `src/lib/services/ErrorLoggerService.ts` |
| E-002 | Inconsistent try-catch patterns in pages | Various pages |
| E-003 | No global error boundary component | App-level |
| E-004 | API errors show generic "Something went wrong" | UX issue |
| E-005 | No error categorization (network, auth, validation) | Debugging difficulty |
| E-006 | Console.log statements left in production code | 30+ files |
| E-007 | No structured logging in Edge Functions | Debugging difficulty |

### Observability Gaps

| Gap ID | Description | Impact |
|--------|-------------|--------|
| E-008 | No APM integration (Sentry, DataDog, etc.) | No production monitoring |
| E-009 | No custom metrics collection | No business insights |
| E-010 | No request tracing (correlation IDs) | Difficult debugging |
| E-011 | No performance monitoring | Blind to bottlenecks |
| E-012 | Admin dashboard metrics not real-time | Stale data |

---

## 6. Frontend Architecture

### State Management

| Gap ID | Description | Recommendation |
|--------|-------------|----------------|
| F-001 | Only `AuthContext` exists, no global state for other data | Add Zustand for global state |
| F-002 | No optimistic updates for user interactions | Add mutation patterns |
| F-003 | No offline support/caching strategy | Add PWA support |
| F-004 | `localStorage` used directly without abstraction | Create storage service |

### Component Architecture

| Gap ID | Description | Impact |
|--------|-------------|--------|
| F-005 | 24 admin components with repeated patterns | Code duplication |
| F-006 | Onboarding has 17 screen components without shared base | Maintenance burden |
| F-007 | No component documentation (Storybook) | Onboarding difficulty |
| F-008 | No TypeScript strict mode | Type safety gaps |

### Code Quality

| Gap ID | Description | Files Affected |
|--------|-------------|----------------|
| F-009 | No ESLint strict rules for React hooks | All components |
| F-010 | No Prettier configuration visible | Inconsistent formatting |
| F-011 | Console statements in production | 30+ files |
| F-012 | Magic strings for interaction types | Multiple files |

---

## 7. Backend & Edge Functions

### Edge Function Gaps

| Gap ID | Function | Issue |
|--------|----------|-------|
| B-001 | `classify-title-ai` | No circuit breaker for OpenAI failures |
| B-002 | `full-refresh-orchestrator` | No dead letter queue for failed jobs |
| B-003 | `send-email-otp` | No email template validation |
| B-004 | `send-phone-otp` | No phone number validation (E.164 format) |
| B-005 | All functions | No request ID logging for tracing |
| B-006 | All functions | No health check endpoints |
| B-007 | `transcribe-trailers` | No audio/video format validation |

### Job System Gaps

| Gap ID | Description | Impact |
|--------|-------------|--------|
| B-008 | No job queue (using self-invocation instead) | Unreliable execution |
| B-009 | No job scheduling UI for admins | Manual job management |
| B-010 | No job dependency management | Sequential execution only |
| B-011 | No job result persistence | Lost job outputs |
| B-012 | Cron jobs defined in SQL but no monitoring | Silent failures |

---

## 8. User Experience

### Accessibility Gaps

| Gap ID | Description | WCAG Level |
|--------|-------------|------------|
| U-001 | No skip-to-content links | A |
| U-002 | Color contrast not verified | AA |
| U-003 | No keyboard navigation testing | A |
| U-004 | No ARIA labels on interactive elements | A |
| U-005 | No screen reader testing | A |
| U-006 | No focus management on route changes | AA |

### Mobile Experience

| Gap ID | Description | Impact |
|--------|-------------|--------|
| U-007 | `use-mobile.tsx` only detects breakpoint, no gesture support | Limited mobile UX |
| U-008 | No pull-to-refresh on lists | Missing mobile pattern |
| U-009 | No swipe actions on cards | Missing mobile pattern |
| U-010 | Three.js 3D elements not mobile-optimized | Performance on mobile |

### Onboarding UX

| Gap ID | Description | Drop-off Risk |
|--------|-------------|---------------|
| U-011 | 17-step onboarding flow may cause abandonment | High |
| U-012 | No progress indicator on all steps | Medium |
| U-013 | No "Skip for now" option on optional steps | Medium |
| U-014 | No onboarding A/B testing infrastructure | Unable to optimize |

---

## 9. Business & Feature Gaps

### Missing Core Features

| Gap ID | Feature | Business Impact |
|--------|---------|-----------------|
| BF-001 | Push notifications for recommendations | Low engagement |
| BF-002 | In-app messaging between friends | Limited social features |
| BF-003 | Content request feature | User voice not captured |
| BF-004 | Watch history sync (external services) | Incomplete data |
| BF-005 | Calendar integration for scheduled watching | Missed engagement opportunity |
| BF-006 | Sharing to social media | Limited virality |
| BF-007 | Deep linking to specific titles | Marketing limitation |

### Monetization Gaps

| Gap ID | Feature | Revenue Impact |
|--------|---------|----------------|
| BF-008 | No subscription/premium tier support | No revenue model |
| BF-009 | No payment integration (Stripe, etc.) | Cannot monetize |
| BF-010 | No referral/affiliate tracking | No referral revenue |
| BF-011 | No ad placement infrastructure | No ad revenue |

### Analytics Gaps

| Gap ID | Description | Business Impact |
|--------|-------------|-----------------|
| BF-012 | No cohort analysis capability | Cannot segment users |
| BF-013 | No funnel analytics | Cannot identify drop-offs |
| BF-014 | No A/B testing framework | Cannot optimize |
| BF-015 | No recommendation quality metrics | Cannot measure AI effectiveness |

---

## 10. DevOps & Infrastructure

### Deployment Gaps

| Gap ID | Description | Risk |
|--------|-------------|------|
| DO-001 | No staging environment configuration visible | Direct-to-prod deployments |
| DO-002 | No database migration rollback strategy | Risky deployments |
| DO-003 | No feature flag system | All-or-nothing releases |
| DO-004 | No canary deployment support | Risky releases |

### Infrastructure Gaps

| Gap ID | Description | Impact |
|--------|-------------|--------|
| DO-005 | No rate limiting on API endpoints | DoS vulnerability |
| DO-006 | No CDN for static assets | Slow global performance |
| DO-007 | No backup strategy documented | Data loss risk |
| DO-008 | No disaster recovery plan | Business continuity risk |

### Documentation Gaps

| Gap ID | Description | Impact |
|--------|-------------|--------|
| DO-009 | No API documentation | Developer onboarding difficulty |
| DO-010 | No architecture diagrams | Understanding difficulty |
| DO-011 | No runbook for operations | Incident response delay |
| DO-012 | `SEED_DATA_README.md` exists but no main README | Project overview missing |

---

## Priority Matrix

### Immediate (Sprint 1-2)

| Priority | Gap IDs | Description |
|----------|---------|-------------|
| P0 | S-001, S-002 | Add RLS policies to critical tables |
| P0 | T-001, T-006 | Set up testing infrastructure |
| P0 | S-015 | Enable JWT verification on Edge Functions |
| P0 | E-001 | Add error alerting/monitoring |

### Short-term (Sprint 3-6)

| Priority | Gap IDs | Description |
|----------|---------|-------------|
| P1 | D-003, D-006 | Fix schema issues and add indexes |
| P1 | P-001, P-002 | Add React Query caching strategy |
| P1 | B-001, B-002 | Add circuit breakers and error handling |
| P1 | F-001 | Add global state management |

### Medium-term (Quarter 2)

| Priority | Gap IDs | Description |
|----------|---------|-------------|
| P2 | U-001-U-006 | Accessibility audit and fixes |
| P2 | BF-001-BF-003 | Add push notifications and messaging |
| P2 | P-008-P-012 | Database performance optimization |
| P2 | DO-001-DO-004 | Deployment pipeline improvements |

### Long-term (Quarter 3+)

| Priority | Gap IDs | Description |
|----------|---------|-------------|
| P3 | BF-008-BF-011 | Monetization features |
| P3 | P-013-P-016 | Scalability improvements |
| P3 | DO-005-DO-008 | Infrastructure hardening |

---

## Conclusion

ViiB has an impressive foundation with a sophisticated emotion-based recommendation engine, comprehensive admin tools, and a modern tech stack. However, to become an exceptional, production-ready application, the following critical areas must be addressed:

1. **Security First**: RLS policies and Edge Function authentication are the most critical gaps
2. **Quality Assurance**: Complete absence of testing infrastructure is a significant risk
3. **Production Readiness**: Error handling, monitoring, and observability need significant improvement
4. **Performance at Scale**: Several database and frontend patterns need optimization
5. **Business Features**: Monetization and engagement features are underdeveloped

Addressing these gaps systematically will transform ViiB from a promising prototype into an exceptional, scalable, and maintainable production application.

---

## Appendix: Files Reviewed

- `src/integrations/supabase/types.ts` (2627 lines - full database schema)
- `supabase/migrations/` (100+ migration files)
- `supabase/functions/` (20 Edge Functions)
- `src/components/` (100+ React components)
- `src/pages/` (15+ page components)
- `src/hooks/` (6 custom hooks)
- `src/contexts/` (1 context)
- `src/lib/services/` (2 services)
