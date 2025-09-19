/**
 * Namespaces localStorage keys per user to prevent cross-account leakage
 */
export const cursorKey = (base: string, userId: string) => `${base}:${userId}`;

/**
 * Global userId for cursor key generation in collections
 * Set by the provider when user authenticates
 */
let currentUserId: string | null = null;

export const setCurrentUserId = (userId: string | null) => {
  currentUserId = userId;
};

export const getCurrentUserId = () => currentUserId;

/**
 * Get cursor key for current user, fallback to base if no user
 */
export const getUserCursorKey = (base: string) => {
  const userId = getCurrentUserId();
  return userId ? cursorKey(base, userId) : base;
};
