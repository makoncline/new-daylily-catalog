export function hasActiveSubscription(
  status: string | null | undefined,
): boolean {
  if (!status) return false;

  switch (status) {
    case "active":
    case "trialing":
      return true;
    case "canceled":
    case "incomplete":
    case "incomplete_expired":
    case "past_due":
    case "unpaid":
    case "paused":
      return false;
    default:
      return false;
  }
}
