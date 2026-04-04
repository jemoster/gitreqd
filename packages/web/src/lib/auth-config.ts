/**
 * Cloud-style Auth0 login is active only when all required Auth0 env vars are set.
 * Local `gitreqd browser` / tests typically omit these so APIs and UI work without login.
 */
export function isCloudAuthConfigured(): boolean {
  return Boolean(
    process.env.AUTH0_DOMAIN?.trim() &&
      process.env.AUTH0_CLIENT_ID?.trim() &&
      process.env.AUTH0_CLIENT_SECRET?.trim() &&
      process.env.AUTH0_SECRET?.trim()
  );
}
