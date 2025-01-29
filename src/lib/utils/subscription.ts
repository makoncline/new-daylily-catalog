export function hasActiveSubscription(
  stripeCustomerId: string | null,
): boolean {
  // For now, we'll consider any user with a Stripe customer ID as having an active subscription
  // In a real app, you'd want to check the actual subscription status
  return !!stripeCustomerId;
}
