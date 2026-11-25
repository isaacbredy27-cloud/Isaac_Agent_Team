// Auth screen copy in one object so it can be swapped for apps/web/src/content/copy.ts later.
// Source: docs/design/ux/auth-flows.md (Wren). Never reveal whether an email has an account.

export const authCopy = {
  loading: "Loading…",
  orDivider: "or",
  google: "Continue with Google",
  emailLabel: "Email",
  passwordLabel: "Password",
  newPasswordLabel: "New password",
  showPassword: "Show password",
  hidePassword: "Hide password",
  backToLogin: "Back to log in",
  logOut: "Log out",
  notConfigured: "Sign in is not set up yet.",

  signIn: {
    title: "Log in",
    button: "Log in",
    busy: "Logging in…",
    forgot: "Forgot password?",
    toSignUp: "New here? Create an account",
  },
  signUp: {
    title: "Create your account",
    button: "Create account",
    busy: "Creating account…",
    toSignIn: "Already have an account? Log in",
  },
  checkEmail: {
    title: "Check your email",
    signUpBody: (email: string) => `If you can sign up with ${email}, we sent a link there. Open it to finish.`,
    resetBody: (email: string) => `If ${email} has an account, we sent a link to reset your password. It can take a minute.`,
  },
  forgot: {
    title: "Reset your password",
    body: "Enter your email. We'll send you a link to set a new password.",
    button: "Send reset link",
    busy: "Sending…",
  },
  update: {
    title: "Choose a new password",
    button: "Save password",
    busy: "Saving…",
    saved: "Password saved. You're logged in.",
  },
  callback: {
    busy: "Signing you in…",
  },
  mfaEnroll: {
    title: "Set up your authenticator app",
    scan: "Scan this code with your authenticator app.",
    qrAlt: "QR code for your authenticator app",
    manual: "Can't scan? Type this code in your app instead.",
    copy: "Copy code",
    copied: "Code copied.",
    next: "Next",
    verify: "Verify and turn on",
    busy: "Checking…",
    back: "Back",
    doneTitle: "Your authenticator is on",
    doneButton: "Continue",
  },
  mfaChallenge: {
    title: "Enter your code",
    body: "Open your authenticator app. Type the 6-digit code.",
    button: "Verify",
    busy: "Checking…",
  },
  code: {
    label: "6-digit code",
    hint: "Open your authenticator app. Type the code you see.",
  },
  stepUp: {
    title: "Confirm it's you",
    // UX draft also asks for the password. Step-up checks only a fresh TOTP (amr[0]), so the code is enough.
    body: "Approving changes the live app. Enter the code from your authenticator app.",
    button: "Confirm",
    busy: "Checking…",
    cancel: "Cancel",
  },
  notAvailable: {
    title: "This page isn't available",
    body: "Go back to your matches.",
    link: "Go to matches",
  },
  error: {
    credentials: "That email and password don't match. Try again or reset your password.",
    rate: "Too many tries. Wait a minute and try again.",
    generic: "Something went wrong on our side. Try again in a moment.",
    offline: "You're offline. Connect to the internet and try again.",
    email: "Enter an email like name@example.com.",
    weakPassword: "Use a longer password with a mix of letters and numbers.",
    linkExpired: "This link has expired. Ask for a new one.",
    google: "We couldn't sign you in with Google. Try again or use your email.",
    mfaCode: "That code didn't work. Wait for a new one and try again.",
    sessionEnded: "Your session ended. Log in again.",
  },
} as const;

export type AuthCopy = typeof authCopy;
