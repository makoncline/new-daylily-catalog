/** @param {string} name @param {string} prefix @param {NodeJS.ProcessEnv} [env] */
export function requireTestKey(name, prefix, env = process.env) {
  const value = env[name];
  if (!value?.startsWith(prefix))
    throw new Error(`${name} must be a Development test key (${prefix}).`);
  return value;
}

/** @param {NodeJS.ProcessEnv} env */
export function requireDevelopmentKeys(env) {
  requireTestKey("CLERK_SECRET_KEY", "sk_test_", env);
  requireTestKey("STRIPE_SECRET_KEY", "sk_test_", env);
  requireTestKey("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test_", env);
}
