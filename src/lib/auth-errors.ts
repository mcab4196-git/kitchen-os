// Plain words for Supabase Auth errors (PLAN 6.5): pure, unit-tested.
//
// Supabase's own text is lower-case jargon ("email rate limit exceeded"). Its error
// codes are stable, so the ones a beta tester can actually hit get a sentence that
// says what happened and what to do; anything else keeps Supabase's text.

type AuthErrorLike = { code?: string; status?: number; message: string };

const TRY_LATER = "Too many tries in a short time. Wait a few minutes, then try again.";

export function signUpErrorMessage(err: AuthErrorLike): string {
  switch (err.code) {
    case "over_email_send_rate_limit":
      return "We can't send a confirmation email right now: too many went out in the last hour. Please try again later.";
    case "email_address_not_authorized":
      return "We can't send a confirmation email to that address yet. Ask the person who shared the link with you.";
    case "email_address_invalid":
      return "That email address doesn't look right. Check it and try again.";
    case "weak_password":
      return "Choose a stronger password: at least 8 characters, and not a common one.";
    case "user_already_exists":
    case "email_exists":
      return "There's already an account with that email. Sign in instead.";
    case "over_request_rate_limit":
      return TRY_LATER;
  }
  return err.status === 429 ? TRY_LATER : err.message;
}

export function signInErrorMessage(err: AuthErrorLike): string {
  switch (err.code) {
    case "invalid_credentials":
      return "That email and password don't match. Check them and try again.";
    case "email_not_confirmed":
      return "Confirm your email first: open the link we sent you, then sign in.";
    case "over_request_rate_limit":
      return TRY_LATER;
  }
  return err.status === 429 ? TRY_LATER : err.message;
}
