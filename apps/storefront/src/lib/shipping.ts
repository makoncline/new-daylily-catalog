export interface ShippingPolicy {
  baseItems: number;
  baseRate: number;
  additionalItemRate: number;
}

export function calculateShipping(
  itemCount: number,
  policy: ShippingPolicy,
): number {
  if (itemCount <= 0) return 0;
  const additionalItems = Math.max(0, itemCount - policy.baseItems);
  return policy.baseRate + additionalItems * policy.additionalItemRate;
}
