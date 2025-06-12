export function isOAuthEnabled() {
  return !!process.env.GLEAN_OAUTH_ENABLED;
}
