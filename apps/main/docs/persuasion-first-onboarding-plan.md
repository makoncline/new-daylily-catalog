# Persuasion-First Anonymous Onboarding

Status: implemented as `real_product_v2`

## Goal

Help a prospective grower recognize a problem in their current sales workflow,
experience the real Daylily Catalog advantage, and understand the buyer outcome
before being asked for an email or trial commitment.

The flow should promise a current, searchable, shareable catalog. It must not
promise more sales, shame a grower's existing workflow, or make disposable demo
work look like permanent setup.

## Product principles

- Show the real product loop instead of a simplified imitation.
- Use real cultivar data and photos before asking for contact information.
- Keep all pre-checkout listing edits in the versioned browser draft.
- Import only the garden name after checkout and account verification.
- Ask for each piece of information once.
- Compose for phones first and use an intentional split layout on iPad portrait.
- Prefer flat page structure and dividers; reserve cards for actual product
  artifacts such as listings and social previews.
- Treat analytics as best-effort. Telemetry must never block the journey.

## Implemented journey

| Step                  | Stored step ID | Customer action                                                                 | Information collected                          | Product result                                            |
| --------------------- | -------------- | ------------------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------- |
| 1. Your needs         | `workflow`     | Select the closest current workflow and estimated collection size               | Workflow and size bucket                       | Later language and analytics gain useful context          |
| 2. Your cultivars     | `buyer-need`   | Search the real registry and select two to five cultivars                       | Cultivar reference IDs and public display data | A private browser collection using real data and photos   |
| 3. Before and after   | `problem`      | Compare plain inventory rows with enriched catalog presentation                 | None                                           | Shows the value of linked cultivar data                   |
| 4. Listings           | `search-tour`  | Edit quantity, price, availability, and seller notes                            | Browser-only listing fields                    | A production-shaped private listings workspace            |
| 5. Buyers and sharing | `proof`        | Switch between a shared listing and buyer catalog; search or filter the catalog | Interaction state only                         | Demonstrates discovery and Facebook/iMessage presentation |
| 6. Your preview       | `personalize`  | Enter a garden or seller name                                                   | Garden name                                    | A recognizable example catalog identity                   |
| 7. Save               | `email`        | Review the preview and submit a valid email                                     | Email                                          | A connected lead after the value experience               |
| 8. Checkout           | `checkout`     | Review trial terms and start checkout                                           | Confirmed email                                | Checkout, authentication, and dashboard handoff           |

Legacy step IDs remain readable only so an existing browser draft can migrate
without trapping the user on a removed screen.

## Data and trust boundary

The onboarding search calls the bounded public `onboarding.searchCultivars`
procedure. It returns only the public cultivar fields required for search and
presentation.

Selected cultivars and listing edits are stored in browser storage. They are
never created as real listings and never uploaded during onboarding. The save
and checkout screens say this explicitly.

After a new account is created and verified, the checkout claim may import the
garden name. It does not import the sample cultivars, listing prices, quantities,
notes, or images. Existing accounts do not receive onboarding profile data.

## Analytics contract

The browser initializes PostHog before the first interactive step and records a
named flow version. The browser's anonymous distinct ID is sent with the
validated server email-capture request so the pre-email journey and server lead
event can belong to one person timeline. The draft ID remains a diagnostic
property and fallback identity.

Important event groups:

- entry, step viewed, step exited, validation failure;
- needs answers and cultivar selection/removal;
- listing edits, buyer-catalog interactions, and share-preview views;
- personalization and value/aha completion;
- email collection, checkout creation, account claim, and activation.

Do not put free-text garden names, listing notes, search text, or raw email in
client analytics properties. Raw email is limited to the approved server-side
lead/account context.

Session replay starts at onboarding entry while traffic is low. Inputs are
masked globally through the PostHog replay configuration, and echoed personal
text uses the `ph-mask` class where appropriate.

## Activation and iteration

Email capture and checkout are conversions, but not product activation. Review
the downstream sequence as traffic permits:

1. account claimed;
2. first real listing created;
3. catalog published;
4. listing or catalog shared;
5. first meaningful buyer intent;
6. seller returns to maintain availability.

At low volume, review complete individual journeys and session replays before
drawing conclusions from funnel percentages. Aggregate repeated exit points and
qualitative friction before changing the flow. A single replay can reveal a
defect, but it should not define the persuasion model by itself.

## Verification expectations

Changes to this flow should preserve a small set of high-signal checks:

- draft creation, persistence, and migration;
- the bounded anonymous cultivar search;
- browser/server analytics identity continuity;
- the complete anonymous journey through local checkout and account claim;
- proof that only the garden name imports and no listing is created;
- no horizontal overflow at a 390-by-844 phone viewport;
- the deliberate split layout at an 820-by-1180 iPad viewport.

Use the flow like a real grower in a browser after automated checks. A screen is
not successful merely because it renders; its controls, copy, and resulting
product state must make sense in sequence.
