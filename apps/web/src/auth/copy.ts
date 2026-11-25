// Auth screen copy. One source: copy.auth in apps/web/src/content/copy.ts (Wren).
// This file only maps those keys to the shape the auth screens use.
// Keys marked "local" have no entry there yet; Wren may move them into content/copy.ts.
// Never reveal whether an email has an account.
import { copy } from "../content/copy";

const c = copy.auth;

export const authCopy = {
  loading: "Loading…", // local
  orDivider: c.or,
  google: c.google,
  emailLabel: c.emailLabel,
  passwordLabel: c.passwordLabel,
  newPasswordLabel: "New password", // local
  showPassword: c.showPassword,
  hidePassword: c.hidePassword,
  backToLogin: c.checkEmail.backToLogin,
  logOut: c.logout.button,
  notConfigured: "Sign in is not set up yet.", // local
  loggedOut: c.logout.done,

  signIn: {
    title: c.login.title,
    button: c.login.button,
    busy: c.login.loading,
    forgot: c.login.forgot,
    toSignUp: c.login.toSignup,
  },
  signUp: {
    title: c.signup.title,
    button: c.signup.button,
    busy: c.signup.loading,
    toSignIn: c.signup.toLogin,
  },
  checkEmail: {
    title: c.checkEmail.title,
    signUpBody: c.checkEmail.signupBody,
    resetBody: c.checkEmail.resetBody,
  },
  forgot: {
    title: c.forgot.title,
    body: c.forgot.body,
    button: c.forgot.button,
    busy: c.forgot.loading,
  },
  update: {
    title: c.update.title,
    button: c.update.button,
    busy: c.update.loading,
    saved: c.update.saved,
  },
  callback: {
    busy: "Signing you in…", // local
  },
  mfaEnroll: {
    title: c.mfaEnrol.scanTitle,
    scan: c.mfaEnrol.scanBody,
    qrAlt: c.mfaEnrol.qrAlt,
    manual: c.mfaEnrol.manualLabel,
    copy: c.mfaEnrol.copyCode,
    copied: "Code copied.", // local
    next: c.mfaEnrol.next,
    verify: c.mfaEnrol.verify,
    busy: c.mfaEnrol.checking,
    back: "Back", // local
    doneTitle: c.mfaEnrol.doneTitle,
    doneButton: c.mfaEnrol.continue,
  },
  mfaChallenge: {
    title: c.mfaChallenge.title,
    body: c.mfaChallenge.body,
    button: c.mfaChallenge.button,
    busy: c.stepUp.checking,
  },
  code: {
    label: c.mfaEnrol.codeLabel,
    hint: c.mfaEnrol.codeHint,
  },
  stepUp: {
    title: c.stepUp.title,
    // Code-only step-up (Wren confirmed): the Function checks a fresh TOTP at amr[0].
    body: c.stepUp.body,
    button: c.stepUp.confirm,
    busy: c.stepUp.checking,
    cancel: "Cancel", // local
  },
  notAvailable: {
    title: c.notAvailable.title,
    // Wren review item 16: the page is "jobs". content/copy.ts still says "matches"; Wren to align.
    body: "Go back to your jobs.",
    link: "Back to jobs",
  },
  error: {
    credentials: c.error.credentials,
    rate: c.error.rate,
    generic: c.error.generic,
    offline: c.error.offline,
    email: c.error.email,
    weakPassword: c.update.weak,
    linkExpired: c.error.linkExpired,
    google: c.googleFlow.error,
    mfaCode: c.error.mfaCode,
    sessionEnded: c.mfaChallenge.sessionEnded,
  },
} as const;

export type AuthCopy = typeof authCopy;
