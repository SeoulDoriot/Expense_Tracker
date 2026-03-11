export function toFriendlyAuthMessage(message: string) {
  const normalized = message.trim().toLowerCase();

  if (normalized.includes("email rate limit exceeded")) {
    return "Too many authentication emails were sent from this project. Wait a while before trying again, or configure custom SMTP in Supabase to raise the limit.";
  }

  if (normalized.includes("error sending confirmation email")) {
    return "Supabase could not send the signup email. This is usually an SMTP or email-provider configuration issue in your Supabase project.";
  }

  if (normalized.includes("error sending magic link email")) {
    return "Supabase could not send the signup email. This is usually an SMTP or email-provider configuration issue in your Supabase project.";
  }

  if (normalized.includes("rate limit")) {
    return "Too many requests were sent. Please wait a moment and try again.";
  }

  if (
    normalized.includes("provider is not enabled") ||
    normalized.includes("unsupported provider")
  ) {
    return "This social provider is not enabled in your Supabase project yet. Turn it on in Supabase Authentication > Providers before using this button.";
  }

  return message;
}
