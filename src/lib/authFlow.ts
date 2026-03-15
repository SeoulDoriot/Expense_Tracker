export const AUTH_ROUTES = {
  welcome: "/Welcome_Page",
  emailContinue: "/OTP_Request",
  login: "/Log_in",
  signup: "/Sign_up",
  updatePassword: "/Update_Password",
  forgotPassword: "/Forgot_Password",
  setNewPassword: "/Setnew_Password",
  otpVerify: "/otp-verify",
  oauthCallback: "/oauth-callback",
  dashboard: "/dashboard",
} as const;

export const PENDING_SIGNUP_KEY = "pending-signup";
export const SOCIAL_AUTH_INTENT_KEY = "social-auth-intent";

export type PendingSignup = {
  email: string;
  fullName: string;
  password: string;
};

export type SocialAuthIntent = "login" | "signup";

export function storePendingSignup(data: PendingSignup) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(PENDING_SIGNUP_KEY, JSON.stringify(data));
}

export function readPendingSignup() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(PENDING_SIGNUP_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as PendingSignup;
  } catch {
    window.sessionStorage.removeItem(PENDING_SIGNUP_KEY);
    return null;
  }
}

export function clearPendingSignup() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(PENDING_SIGNUP_KEY);
}

export function storeSocialAuthIntent(intent: SocialAuthIntent) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(SOCIAL_AUTH_INTENT_KEY, intent);
}

export function readSocialAuthIntent() {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.sessionStorage.getItem(SOCIAL_AUTH_INTENT_KEY);
  return value === "signup" ? "signup" : value === "login" ? "login" : null;
}

export function clearSocialAuthIntent() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(SOCIAL_AUTH_INTENT_KEY);
}
