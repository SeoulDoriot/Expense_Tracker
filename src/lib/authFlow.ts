export const AUTH_ROUTES = {
  login: "/Log_in",
  signup: "/Sign_up",
  forgotPassword: "/Forgot_Password",
  setNewPassword: "/Setnew_Password",
  otpVerify: "/otp-verify",
  oauthCallback: "/oauth-callback",
  dashboard: "/dashboard",
} as const;

export const PENDING_SIGNUP_KEY = "pending-signup";

export type PendingSignup = {
  email: string;
  fullName: string;
  password: string;
};

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
