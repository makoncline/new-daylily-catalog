export const HERMETIC_PERSONA_COOKIE = "daylily_hermetic_persona";

export const HERMETIC_PERSONAS = /** @type {const} */ ({
  "pro-primary": {
    key: "pro-primary",
    clerkUserId: "hermetic_user_pro_primary",
    email: "pro-primary+clerk_test@hermetic.local",
    name: "Hermetic Pro Garden",
    subscriptionStatus: "active",
  },
  "pro-secondary": {
    key: "pro-secondary",
    clerkUserId: "hermetic_user_pro_secondary",
    email: "pro-secondary+clerk_test@hermetic.local",
    name: "Hermetic Second Garden",
    subscriptionStatus: "trialing",
  },
  "new-unpaid": {
    key: "new-unpaid",
    clerkUserId: "hermetic_user_new_unpaid",
    email: "new-unpaid+clerk_test@hermetic.local",
    name: "Hermetic New Seller",
    subscriptionStatus: "none",
  },
  "free-at-limit": {
    key: "free-at-limit",
    clerkUserId: "hermetic_user_free_at_limit",
    email: "free-at-limit+clerk_test@hermetic.local",
    name: "Hermetic Free Garden",
    subscriptionStatus: "none",
  },
  "billing-past-due": {
    key: "billing-past-due",
    clerkUserId: "hermetic_user_billing_past_due",
    email: "billing-past-due+clerk_test@hermetic.local",
    name: "Hermetic Past Due Garden",
    subscriptionStatus: "past_due",
  },
  "billing-canceled": {
    key: "billing-canceled",
    clerkUserId: "hermetic_user_billing_canceled",
    email: "billing-canceled+clerk_test@hermetic.local",
    name: "Hermetic Canceled Garden",
    subscriptionStatus: "canceled",
  },
  "workflow-seller": {
    key: "workflow-seller",
    clerkUserId: "hermetic_user_workflow_seller",
    email: "workflow-seller+clerk_test@hermetic.local",
    name: "Hermetic Workflow Garden",
    subscriptionStatus: "active",
  },
  "profile-editor": {
    key: "profile-editor",
    clerkUserId: "hermetic_user_profile_editor",
    email: "profile-editor+clerk_test@hermetic.local",
    name: "Hermetic Profile Garden",
    subscriptionStatus: "active",
  },
  "checkout-unpaid": {
    key: "checkout-unpaid",
    clerkUserId: "hermetic_user_checkout_unpaid",
    email: "checkout-unpaid+clerk_test@hermetic.local",
    name: "Hermetic Checkout Garden",
    subscriptionStatus: "none",
  },
});

/** @param {string | undefined} key */
export function getHermeticPersona(key) {
  if (!key || !(key in HERMETIC_PERSONAS)) {
    return null;
  }

  return HERMETIC_PERSONAS[/** @type {keyof typeof HERMETIC_PERSONAS} */ (key)];
}
