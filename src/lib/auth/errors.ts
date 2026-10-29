/** Translation keys under `Auth.errors` that a form can show. */
export type AuthErrorKey =
  | "invalidInput"
  | "invalidCredentials"
  | "emailNotConfirmed"
  | "userExists"
  | "weakPassword"
  | "rateLimited"
  | "linkInvalid"
  | "unexpected";

/**
 * Maps a Supabase Auth error to a message key. Codes are documented at
 * https://supabase.com/docs/guides/auth/debugging/error-codes; anything unknown
 * becomes a generic message so internal details never reach the screen.
 */
export function authErrorKey(error: { code?: string; status?: number } | null | undefined): AuthErrorKey {
  switch (error?.code) {
    case "invalid_credentials":
      return "invalidCredentials";
    case "email_not_confirmed":
      return "emailNotConfirmed";
    case "user_already_exists":
    case "email_exists":
      return "userExists";
    case "weak_password":
      return "weakPassword";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "rateLimited";
    case "otp_expired":
    case "flow_state_expired":
    case "flow_state_not_found":
    case "bad_code_verifier":
      return "linkInvalid";
    default:
      return error?.status === 429 ? "rateLimited" : "unexpected";
  }
}
