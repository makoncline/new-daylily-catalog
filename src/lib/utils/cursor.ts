/**
 * Namespaces localStorage keys per user to prevent cross-account leakage.
 */
export const cursorKey = (base: string, userId: string) => `${base}:${userId}`;

let currentUserId: string | null = null;

export const setCurrentUserId = (userId: string | null) => {
  currentUserId = userId;
};

export const getCurrentUserId = () => currentUserId;

export const getUserCursorKey = (base: string) => {
  const userId = getCurrentUserId();
  return userId ? cursorKey(base, userId) : base;
};

