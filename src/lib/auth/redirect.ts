/** Where a signed-in photographer lands by default. */
export const DASHBOARD_PATH = "/dashboard";

/**
 * Accepts only same-site relative paths for post-login redirects, so a crafted
 * `?next=https://evil.example` or `?next=//evil.example` cannot send users elsewhere.
 */
export function safeNextPath(value: unknown, fallback: string = DASHBOARD_PATH): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 512) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) < 0x20) return fallback; // control characters
  }
  return value;
}

/** Routes that require a signed-in photographer. */
export function isProtectedPath(pathname: string): boolean {
  return pathname === DASHBOARD_PATH || pathname.startsWith(`${DASHBOARD_PATH}/`);
}

/** Auth screens a signed-in photographer should skip. */
export function isAuthScreen(pathname: string): boolean {
  return pathname === "/login" || pathname === "/signup";
}
