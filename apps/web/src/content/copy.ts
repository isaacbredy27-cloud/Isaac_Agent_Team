// All UI strings for Finance Match Orlando. Owner: Wren (ux-designer-apple-hig).
// Rules: grade 8 or lower, sentences of 20 words or fewer, active voice, no blame words.
// Auth copy follows docs/design/ux/auth-flows.md. Bands follow docs/match-scoring.md section 6.

export type Band = "Strong" | "Moderate" | "Weak";

export interface NavItem {
  readonly id: string;
  readonly label: string;
  readonly path: string;
  /** Only super_admin with MFA sees this item. */
  readonly superAdminOnly?: boolean;
}

export interface LinkItem {
  readonly label: string;
  readonly path: string;
}

/** Tab bar: navigation only. Single words. Actions live in the content. */
export const tabBar: readonly NavItem[] = [
  { id: "jobs", label: "Jobs", path: "/jobs" },
  { id: "resume", label: "Resume", path: "/resume" },
  { id: "gaps", label: "Gaps", path: "/gaps" },
  { id: "agents", label: "Agents", path: "/agents", superAdminOnly: true },
];

/** Header and footer links. */
export const siteLinks: readonly LinkItem[] = [
  { label: "How it Works", path: "/how-it-works" },
  { label: "Resources", path: "/resources" },
  { label: "Guide", path: "/guide/" },
];

export const bandLabel: Readonly<Record<Band, string>> = {
  Strong: "Strong Match",
  Moderate: "Moderate Match",
  Weak: "Weak Match",
};

/** Icon names match Sable's set: color is never the only cue. */
export const bandIcon: Readonly<Record<Band, string>> = {
  Strong: "●",
  Moderate: "◐",
  Weak: "○",
};

/** Band from a 0 to 100 score (80 and up, 60 to 79, below 60). */
export function bandFor(score: number): Band {
  const s = Math.round(score);
  if (s >= 80) return "Strong";
  if (s >= 60) return "Moderate";
  return "Weak";
}

/** "86 · Strong Match" */
export function scoreLabel(score: number): string {
  const s = Math.round(score);
  return `${s} · ${bandLabel[bandFor(s)]}`;
}

/** Screen reader name: "86, Strong Match". */
export function scoreAriaLabel(score: number): string {
  const s = Math.round(score);
  return `${s}, ${bandLabel[bandFor(s)]}`;
}

export const copy = {
  app: {
    name: "Finance Match Orlando",
    tagline: "Find Orlando finance jobs that fit your resume.",
    skipToContent: "Skip to content",
    loading: "Loading…",
    back: "Back",
    cancel: "Cancel",
    done: "Done",
    close: "Close",
    tryAgain: "Try again",
  },

  nav: {
    tabBarLabel: "Main",
    siteLinksLabel: "About this app",
    footerNote: "Finance Match Orlando. Your resume stays private.",
    logOut: "Log out",
  },

  upload: {
    title: "Upload your resume",
    cta: "Upload your resume to see your matches.",
    chooseFile: "Choose a file",
    dropHint: "PDF or Word (.docx). Up to 5 MB.",
    pasteInstead: "Paste your resume text instead",
    pasteLabel: "Resume text",
    submit: "See my matches",
    privacy: "We delete your file after reading it. You can delete your profile at any time.",
    uploading: "Uploading…",
    reading: "Reading your resume…",
    done: "Done. Finding your matches…",
    errorSize: "This file is over 5 MB. Save it as a smaller PDF and try again.",
    errorType: "We can read PDF and Word (.docx) files. Save your resume in one of those formats.",
    errorEmpty: "We couldn't find text in this file. Try a PDF saved from your word processor, or paste the text.",
    errorGeneric: "Something went wrong on our side. Try again in a moment.",
  },

  resume: {
    title: "Your resume",
    intro: "Check what we found. Fix anything that looks off.",
    skills: "Skills",
    titles: "Job titles",
    certifications: "Licenses and certificates",
    years: "Years of experience",
    education: "Education",
    inferred: "We guessed this. Please check it.",
    save: "Save changes",
    saved: "Saved.",
    replace: "Upload a new resume",
    delete: "Delete my profile",
    deleteConfirmTitle: "Delete your profile?",
    deleteConfirmBody: "We will remove it from this device. You can upload again any time.",
    deleteConfirm: "Delete",
    deleted: "Your profile is deleted.",
    empty: "No resume yet. Upload one to see your matches.",
    emptyAction: "Upload your resume",
  },

  jobs: {
    title: "Jobs",
    subtitle: "Recent Orlando-area finance jobs, ranked for you.",
    searchLabel: "Search jobs",
    filters: "Filters",
    filtersTitle: "Filters",
    filtersApply: "Done",
    filtersReset: "Clear all",
    sortLabel: "Sort by",
    sortBest: "Best match",
    sortNewest: "Newest",
    remoteOnly: "Remote only",
    bandFilterLabel: "Match level",
    resultCount: (n: number) => (n === 1 ? "1 job" : `${n} jobs`),
    updated: (when: string) => `Jobs updated ${when}.`,
    loading: "Finding jobs…",
    emptyNoResume: "Upload your resume to see how each job fits you.",
    emptyNoResumeAction: "Upload your resume",
    emptyFilters: "No jobs match these filters. Try removing one.",
    emptyFiltersAction: "Clear filters",
    emptyNone: "No jobs yet. We check for new ones every 2 hours.",
    offline: "You're offline. These results are from your last visit.",
    error: "We couldn't load jobs just now. Try again in a moment.",
    seeWhy: "See why",
    posted: (when: string) => `Posted ${when}`,
    remote: "Remote",
    hybrid: "Hybrid",
    onsite: "On site",
  },

  detail: {
    title: "Job details",
    backToJobs: "Back to jobs",
    apply: "Apply on the employer site",
    applyHint: "Opens in a new tab.",
    save: "Save",
    saved: "Saved",
    unsave: "Remove from saved",
    scoreHeading: "Your match score",
    whyHeading: "Why this score",
    whyIntro: "Our code works out the score. These are the reasons.",
    evidenceHeading: "What matches",
    gapsHeading: "What is missing",
    noGaps: "We found no gaps for this job.",
    recommendationHeading: "What to do next",
    explanationLoading: "Writing your explanation…",
    explanationFallback: "Here are the facts behind your score.",
    scoreBreakdownHeading: "Score breakdown",
    salaryHeading: "Pay",
    salaryPosted: "Pay from the posting",
    salaryEstimate: "Typical Orlando range, based on government wage data. Not from this posting.",
    salaryEstimateLabel: (low: string, high: string) => `Typical Orlando range ${low}–${high} (BLS estimate)`,
    salaryNone: "No pay listed in this posting.",
    gateTitle: "One thing to know",
    gateExample: "This role needs a Series 7 license. You can start with the SIE exam.",
    weakIntro: "This one is a stretch today. Here is how to close the gap.",
    moderateIntro: "You are close. A few steps could move this up.",
    strongIntro: "This looks like a strong fit. Review it and apply.",
    notFound: "We can't find that job. It may be closed.",
    notFoundAction: "Back to jobs",
    breakdown: {
      reqSkills: "Required skills",
      experience: "Years of experience",
      education: "Education",
      certs: "Licenses and certificates",
      industry: "Industry experience",
      prefSkills: "Preferred skills",
      title: "Title and level",
      location: "Location",
      inactive: "Not stated in this posting, so it does not count.",
    },
  },

  gaps: {
    title: "Skill gaps",
    subtitle: "Skills that show up often in jobs you like, but not in your resume.",
    frequency: (n: number) => (n === 1 ? "Asked for in 1 job" : `Asked for in ${n} jobs`),
    howToStart: "How to get started",
    empty: "No gaps to show yet. Upload your resume to see them.",
    emptyAction: "Upload your resume",
    none: "Nice. We found no common gaps in your top matches.",
    loading: "Looking for gaps…",
    error: "We couldn't load your gaps just now. Try again in a moment.",
  },

  recommendations: {
    heading: "What to do next",
    applyNow: "Apply to this job.",
    learnSkill: (skill: string) => `Learn ${skill}. It shows up in many of your matches.`,
    getLicense: (name: string) => `Work toward the ${name}. Some roles need it.`,
  },

  auth: {
    google: "Continue with Google",
    or: "or",
    emailLabel: "Email",
    passwordLabel: "Password",
    showPassword: "Show password",
    hidePassword: "Hide password",
    signup: {
      title: "Create your account",
      button: "Create account",
      loading: "Creating account…",
      toLogin: "Already have an account? Log in",
      privacy: "We use your email only to sign you in. We never post your resume anywhere.",
    },
    checkEmail: {
      title: "Check your email",
      signupBody: (email: string) => `If you can sign up with ${email}, we sent a link there. Open it to finish.`,
      resetBody: (email: string) => `If ${email} has an account, we sent a link to reset your password. It can take a minute.`,
      hint: "It can take a minute. Check your spam folder too.",
      resend: "Resend email",
      resendWait: (m: string) => `Resend in ${m}`,
      resendReady: "Resend email is ready.",
      sending: "Sending…",
      resent: "We sent it again. Check your spam folder too.",
      resendError: "We couldn't send it just now. Wait a minute and try again.",
      differentEmail: "Use a different email",
      backToLogin: "Back to log in",
      confirmed: "Email confirmed. You're in.",
    },
    login: {
      title: "Log in",
      button: "Log in",
      loading: "Logging in…",
      forgot: "Forgot password?",
      toSignup: "New here? Create an account",
    },
    logout: {
      button: "Log out",
      loading: "Logging out…",
      error: "We couldn't log you out. Try again.",
      done: "You're logged out.",
    },
    forgot: {
      title: "Reset your password",
      body: "Enter your email. We will send you a link.",
      button: "Send reset link",
      loading: "Sending…",
    },
    expired: {
      title: "This link has expired",
      body: "Links work once and for a short time. Ask for a new one.",
      button: "Send a new link",
    },
    update: {
      checking: "Checking your link…",
      title: "Choose a new password",
      button: "Save password",
      loading: "Saving…",
      saved: "Password saved. You're logged in.",
      weak: "Pick a different password. Try a longer one.",
      otherDevices: "We logged you out on other devices.",
    },
    googleFlow: {
      loading: "Taking you to Google…",
      cancel: "You didn't finish signing in with Google. You can try again or use your email.",
      error: "We couldn't sign you in with Google. Try again or use your email.",
    },
    mfaEnrol: {
      scanTitle: "Set up your authenticator app",
      scanBody: "Open an authenticator app. Scan this code.",
      qrAlt: "QR code for your authenticator app. A text code is below if you can't scan.",
      manualLabel: "Can't scan? Type this code in your app instead.",
      copyCode: "Copy code",
      next: "Next",
      making: "Making your code…",
      makeError: "We couldn't make your code. Try again.",
      step: (n: number, total: number) => `Step ${n} of ${total}`,
      codeLabel: "6-digit code",
      codeHint: "Open your authenticator app. Type the code you see.",
      verify: "Verify and turn on",
      checking: "Checking…",
      doneTitle: "Your authenticator is on",
      doneBody: "You will enter a code each time you log in.",
      continue: "Continue",
    },
    mfaChallenge: {
      title: "Enter your code",
      body: "Open your authenticator app. Type the 6-digit code.",
      button: "Verify",
      sessionEnded: "Your session ended. Log in again.",
      sessionEndedAction: "Log in",
    },
    stepUp: {
      title: "Confirm it's you",
      body: "Approving changes the live app. Enter your password and code.",
      confirm: "Confirm and approve",
      checking: "Checking…",
      grabber: "Resize sheet",
      approving: "Approved. Saving the change…",
    },
    notAvailable: {
      title: "This page isn't available",
      body: "Go back to your matches.",
      button: "Back to matches",
      docTitle: "Page not available",
    },
    error: {
      credentials: "That email and password don't match. Try again or reset your password.",
      rate: "Too many tries. Wait a minute and try again.",
      generic: "Something went wrong on our side. Try again in a moment.",
      offline: "You're offline. Connect to the internet and try again.",
      email: "Enter an email like name@example.com.",
      passwordShort: (n: number) => `Use at least ${n} characters.`,
      linkExpired: "This link has expired. Ask for a new one.",
      mfaCode: "That code didn't work. Wait for a new one and try again.",
      stepUp: "That didn't work. Check your password and code and try again.",
    },
  },

  agents: {
    title: "Agents",
    subtitle: "Pick an agent to chat with. Review every change before it goes live.",
    listLabel: "Agents",
    groupLabels: {
      leadership: "Leadership",
      domain: "Domain",
      experience: "Experience",
      platform: "Platform",
      quality: "Quality",
    } as Readonly<Record<string, string>>,
    model: "Model",
    knowledge: "Knowledge",
    docs: (n: number) => (n === 1 ? "1 doc" : `${n} docs`),
    examples: (n: number) => (n === 1 ? "1 example" : `${n} examples`),
    chatWith: (name: string) => `Chat with ${name}`,
    loading: "Loading agents…",
    empty: "No agents found.",
    error: "We couldn't load the agents. Try again in a moment.",
    proposalsHeading: "Proposals",
    proposalsEmpty: "No proposals waiting. Ask an agent for a change.",
    proposalsPending: (n: number) => (n === 1 ? "1 proposal waiting" : `${n} proposals waiting`),
  },

  chat: {
    title: (name: string) => `Chat with ${name}`,
    inputLabel: "Message",
    inputPlaceholder: "Ask for a change or an answer",
    send: "Send",
    sending: "Sending…",
    stop: "Stop",
    thinking: "Thinking…",
    empty: "Say what you want to do next.",
    newChat: "New chat",
    proposalReady: "This agent made a proposal. Review it before anything changes.",
    reviewProposal: "Review proposal",
    error: "We couldn't reach the agent. Try again in a moment.",
    rate: "Too many messages. Wait a minute and try again.",
    sessionEnded: "Your session ended. Log in again.",
  },

  proposal: {
    title: "Review proposal",
    from: (name: string) => `From ${name}`,
    rationale: "Why",
    files: "Files",
    fileCount: (n: number) => (n === 1 ? "1 file changes" : `${n} files change`),
    diff: "Changes",
    added: "Added",
    removed: "Removed",
    newFile: "New file",
    noChanges: "This proposal has no changes.",
    approve: "Approve",
    reject: "Reject",
    approveHint: "Approve saves this change to the live app. You can undo it later.",
    rejectTitle: "Reject this proposal?",
    rejectReasonLabel: "Reason (optional)",
    rejectConfirm: "Reject",
    rejected: "Rejected. Nothing changed.",
    approved: (sha: string) => `Approved. Saved as ${sha}.`,
    viewCommit: "View the change on GitHub",
    revert: "Undo this change",
    baseChanged: "The code changed since this proposal. Ask the agent to update it.",
    blockedPath: "This proposal touches a file agents can't change. Ask for a different change.",
    alreadyDone: "This proposal is already done.",
    error: "We couldn't save the change. Nothing was changed. Try again in a moment.",
    status: {
      pending: "Waiting for review",
      approved: "Approved",
      rejected: "Rejected",
    } as Readonly<Record<string, string>>,
  },

  offline: {
    banner: "You're offline. You can still read your last results.",
    pageTitle: "You're offline",
    pageBody: "Connect to the internet to see new jobs. Your last results are still here.",
    pageAction: "Try again",
    back: "Back online. Showing new results.",
    uploadNeedsNet: "You need to be online to read a new resume.",
  },

  errors: {
    generic: "Something went wrong on our side. Try again in a moment.",
    network: "We can't reach the internet. Check your connection and try again.",
    notFoundTitle: "We can't find that page",
    notFoundBody: "Go back to your matches.",
    notFoundAction: "Back to matches",
    rateLimit: "Too many tries. Wait a minute and try again.",
    unavailable: "This is taking longer than usual. Try again in a moment.",
  },

  install: {
    title: "Add to your Home Screen",
    body: "Open this app faster, like any other app.",
    ios: "Tap the Share button, then Add to Home Screen.",
    android: "Tap Install, or open the browser menu and pick Install app.",
    action: "Install",
    dismiss: "Not now",
  },

  privacy: {
    short: "Your resume stays private. We use it only to match you to jobs.",
    detail:
      "We read your resume in memory and then delete the file. Your profile lives on this device. We never share it or post it.",
  },
} as const;

export type Copy = typeof copy;
