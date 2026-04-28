# Onboarding Capture Review (Mobile / Tablet / LG)

Date: 2026-02-27

Capture sets reviewed:
- `tests/.tmp/onboarding-flow-captures/before-mobile`
- `tests/.tmp/onboarding-flow-captures/before-tablet`
- `tests/.tmp/onboarding-flow-captures/before-lg`
- `tests/.tmp/onboarding-flow-captures/after-mobile`
- `tests/.tmp/onboarding-flow-captures/after-tablet`
- `tests/.tmp/onboarding-flow-captures/after-lg`

## Subagent A - Conversion UX Review

Findings:
- The flow communicates value before paywall well (`build -> preview -> discovery -> search -> membership`).
- Persistent success toasts overlap key action areas in later steps and on membership, which adds friction right before conversion.
- Step 6 does not explicitly explain what happens after choosing membership vs `Continue for now`.

Recommendations:
- Remove onboarding success toasts and rely on inline completion states.
- Add one explicit transition line on Step 6 explaining the next membership decision and dashboard fallback.

## Subagent B - Layout / Responsive Review

Findings:
- Mobile and tablet full-page captures confirm no clipping after moving to full-page screenshots.
- Footer action buttons are positioned correctly, but toast overlays can still visually collide with bottom controls/content.
- Ownership cues (`Yours`) are visible and useful across mixed preview screens.

Recommendations:
- Eliminate toast overlap risk in onboarding screens.
- Keep existing card/step layout as-is; no structural redesign needed for this pass.

## Subagent C - Flow / IA Review

Findings:
- Step sequence is coherent and teaches buyer outcomes in the right order.
- Step 6 -> membership transition is the only spot where intent could be clearer.

Recommendations:
- Add short transition copy in Step 6 to set expectation before redirect.

## Subagent D - Copy Review

Findings:
- Current copy is concise and mostly aligned with action intent.
- Missing one sentence for post-Step-6 expectation.

Recommendations:
- Add explicit copy: users can continue to dashboard and upgrade later.

## Subagent E - Accessibility / Clarity Review

Findings:
- Interaction controls and labels are clear.
- Toast overlays can obscure important content and interactive elements on smaller viewports.

Recommendations:
- Remove or reposition success toasts during onboarding saves.

## Decision Matrix

| Issue | Step(s) | Breakpoint(s) | Severity | Effort | Decision | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Success toast overlaps content/CTA | 2-6 + membership transition | mobile/tablet/lg | High | Low | Accept | Remove onboarding success toasts |
| Missing "what happens next" expectation before membership | 6 | mobile/tablet/lg | Medium | Low | Accept | Add one transition line in Step 6 |
| Ownership cue consistency | 2/4/5/6 | mobile/tablet/lg | Low | Already done | Keep | `Yours` badges already in place |
| Further layout redesign | multiple | mobile/tablet | Low | Medium/High | Reject (for now) | No blocking issue in current captures |

## Implementation Targets (Accepted)

1. Remove `toast.success("Profile card saved")` in onboarding profile save.
2. Remove `toast.success("Listing card saved")` in onboarding listing save.
3. Add a Step 6 transition note clarifying membership choice and dashboard fallback.
4. Regenerate capture sets for `mobile`, `tablet`, `lg` as `after-*`.

## Regression Pass (Post-Implementation)

Reviewer: Subagent R (regression-focused pass)

Checks:
- Mobile/tablet/lg onboarding capture flows still complete end-to-end.
- Screenshot generation still works in all modes with full-page captures.
- No toast overlays observed in Step 6 and membership captures after removing success toasts.
- Step 6 transition note appears consistently across breakpoints.

Result:
- No regressions found in onboarding flow progression or capture generation.
