# Auth flows: screens, states and copy

Owner: `ux-designer-apple-hig` (Wren). Written 2026-11-25. Status: draft for review by `accessibility-specialist` and `security-expert`.
Source: `docs/plans/supabase-auth.md`, task T2. Resumes stay out of auth (ADR 0004).
No app code. Copy here moves to `apps/web/src/content/` when we build.

## Sources

| Topic | Source | Date read |
|---|---|---|
| HIG accessibility, tab bars, sheets | https://developer.apple.com/design/human-interface-guidelines/accessibility, /tab-bars, /sheets (via `knowledge/ux-designer-apple-hig/docs/`) | 2026-11-25 |
| Plain language | https://www.plainlanguage.gov/guidelines/ | 2026-11-25 |
| Google sign-in branding | https://developers.google.com/identity/branding-guidelines | **To verify.** I could not fetch it on 2026-11-25. Rules below come from the brief, not the page. |
| Supabase behaviour (existing-email replies, rate limits, password rules) | Not read. Wave 1 task T1 owns it. | To verify |

## Principles for every auth screen

1. One job per screen. One primary button. The user always knows the next step.
2. No dead ends. Every error and every success shows a way forward.
3. Auth screens are full pages with no tab bar. The tab bar shows after sign in (HIG: tabs are for navigation, not actions).
4. Sheets are only for step-up (one sheet at a time, with a grabber and Cancel).
5. Same words whether or not an email has an account. This blocks account guessing.
6. Controls are 44 pt tall or more. Text scales to 200%. Layout holds at 320 px.
7. Copy is grade 8 or lower. Sentences are 20 words or fewer. No blame words.
8. Never say "invalid", "failed", "authentication" or "unauthorized" to the user.

## Rule for errors that never reveal an email

| Situation | What we show | What we never show |
|---|---|---|
| Log in, wrong email or wrong password | "That email and password don't match. Try again or reset your password." | Which one was wrong. |
| Sign up with an email that already has an account | The same "Check your email" screen as a new sign up. | "Already registered." |
| Forgot password, any email | The same "Check your email" screen. | "No account found." |
| Too many tries (any form) | "Too many tries. Wait a minute and try again." | Who or what was limited. |
| Reset link bad or old | "This link has expired. Ask for a new one." | The email on the link. |
| Anything unexpected | "Something went wrong on our side. Try again in a moment." | Codes, stack text, provider names. |

Also: response time and layout must match in both cases (security-expert to confirm). Never put the email in a URL or error text. The "Check your email" screen may show the email the user just typed, because they typed it.

## Shared form rules

- Labels sit above fields and stay visible. No placeholder-only labels.
- Email: `type="email"`, `autocomplete="email"` (`username` on log in), `inputmode="email"`, no auto-capitalise, no spellcheck.
- Password: `autocomplete="current-password"` on log in, `new-password` on sign up and update. Allow paste and password managers.
- "Show password" is a button with a 44 pt target. Its name changes: "Show password" / "Hide password". It uses `aria-pressed`.
- Show the password rule before typing, not after failing. Rule length: **open question 1**.
- Primary button text is a verb. While loading it keeps its width, shows a spinner, and the label becomes "Signing in…" (and so on). It stays focused. It is `aria-disabled`, not removed.
- Errors: a message above the form (`role="alert"`) and a short note under the field when one field is at fault. On submit with errors, focus moves to the first field with a problem. For form-wide errors, focus moves to the message. Reduce Motion: no shake or slide.
- Success messages use `role="status"` (polite).
- Do not clear the email field after an error. Do clear the password field.
- Keyboard: Return submits. Tab order follows reading order. Focus ring 3:1 or better, never hidden.

---

## 1. Sign up

- **Purpose:** make an account with email and password.
- **Next action:** "Create account".
- **Layout, top to bottom:** title, Google button, divider "or", email, password, Create account button, link "Already have an account? Log in", privacy line.
- **Fields:** Email (required). Password (required, with show/hide).

| State | What the user sees |
|---|---|
| Idle | Empty form. Focus on the title (heading), then Google button. |
| Loading | Button reads "Creating account…". Fields are read-only. Google button is disabled. |
| Error: empty or bad email shape | Under Email: "Enter an email like name@example.com." |
| Error: password too short | Under Password: "Use at least [N] characters." (N is open question 1.) |
| Error: rate limit | "Too many tries. Wait a minute and try again." |
| Error: other | "Something went wrong on our side. Try again in a moment." |
| Success | Go to screen 1b. |

**Copy**
- Title: "Create your account"
- Button: "Create account"
- Link: "Already have an account? Log in"
- Privacy line: "We use your email only to sign you in. We never post your resume anywhere." (privacy-compliance-specialist to confirm. Matches ADR 0004.)

**Focus and VoiceOver**
- Page `<h1>` takes focus on load. Announce the page title in `<title>`.
- Google button is read as "Continue with Google, button".
- The divider "or" is decorative text, hidden from screen readers with `aria-hidden`.

### 1b. Sign up: check your email (confirmation sent)

- **Purpose:** tell the user to confirm. Show what to do next.
- **Same screen for new and existing emails.**
- **Fields:** none. Buttons: "Resend email" (secondary), "Use a different email" (link back to sign up), "Back to log in".

| State | What the user sees |
|---|---|
| Idle | Message below. "Resend email" is on a 60 second wait (value to verify against Supabase limits). It shows "Resend in 0:42". |
| Loading | "Sending…" |
| Success (resent) | "We sent it again. Check your spam folder too." |
| Error | "We couldn't send it just now. Wait a minute and try again." |
| Link opened, confirmed | Open the app signed in. Go to Upload, or to Matches if a profile exists. Toast: "Email confirmed. You're in." |
| Link bad or old | Screen 4b copy, with button "Back to log in". |

**Copy**
- Title: "Check your email"
- Body: "If you can sign up with [email], we sent a link there. Open it to finish."
- Hint: "It can take a minute. Check your spam folder too."

**Focus and VoiceOver**
- Focus lands on the title. Body is read right after.
- The resend countdown must not announce every second. Announce only when the button turns on: "Resend email is ready."

---

## 2. Log in

- **Purpose:** return to matches fast.
- **Next action:** "Log in".
- **Layout:** title, Google button, "or", email, password, "Forgot password?" link (right of the password label, 44 pt target), Log in button, "New here? Create an account".
- **Fields:** Email, Password.

| State | What the user sees |
|---|---|
| Idle | Empty form. Browser or password manager may fill it. |
| Loading | Button reads "Logging in…". |
| Error: no match | Above form: "That email and password don't match. Try again or reset your password." Focus moves to this message. Password cleared. |
| Error: rate limit | "Too many tries. Wait a minute and try again." |
| Error: email not confirmed | Show the **same no-match message**. Do not say "not confirmed" (it would show the email exists). Open question 2. |
| Error: offline | "You're offline. Connect to the internet and try again." |
| Success | Regular user: go to where they were, else Matches. `super_admin` without MFA: screen 7. `super_admin` with MFA: screen 8. |

**Copy**
- Title: "Log in"
- Button: "Log in"
- Links: "Forgot password?" · "New here? Create an account"

**Focus and VoiceOver**
- Error message has `role="alert"`, so it is read on arrival. Focus also moves to it (`tabindex="-1"`).
- Fields use `aria-describedby` for their notes.
- "Forgot password?" reads as "Forgot password, link".

---

## 3. Log out

- **Purpose:** leave safely, especially on a shared phone.
- **Where:** Profile tab, in the content, as a button "Log out" (an action, so never in the tab bar). No confirmation sheet. It is easy to undo by logging in.
- **Fields:** none.

| State | What the user sees |
|---|---|
| Idle | Button "Log out", 44 pt. |
| Loading | "Logging out…". Button is disabled. |
| Error | "We couldn't log you out. Try again." Stay signed in. The app must not show a false "signed out". |
| Success | Go to Log in with the status "You're logged out." |

**Notes**
- On success, clear personal data held on the device (matches, profile, any cached resume data). This protects ADR 0004. Owner for the cache rule: `mobile-pwa-expert` (open question 3).
- Focus lands on the Log in title. VoiceOver reads "You're logged out" through `role="status"`.

---

## 4. Forgot password

### 4a. Send link

- **Purpose:** get a reset link by email.
- **Next action:** "Send reset link".
- **Fields:** Email (prefilled if the user typed it on Log in).

| State | What the user sees |
|---|---|
| Idle | Title, one sentence, field, button, link "Back to log in". |
| Loading | Button reads "Sending…". |
| Error: bad email shape | "Enter an email like name@example.com." |
| Error: rate limit | "Too many tries. Wait a minute and try again." |
| Error: other | "Something went wrong on our side. Try again in a moment." |
| Success | Screen 4a-2. Always shown, for any email. |

**Copy**
- Title: "Reset your password"
- Body: "Enter your email. We will send you a link."
- Button: "Send reset link"

### 4a-2. Check your email

- Title: "Check your email"
- Body: "If [email] has an account, we sent a link to reset your password. It can take a minute."
- Buttons: "Resend email" (same 60 second wait as 1b), "Back to log in".
- Focus on the title. Same countdown rule as 1b.

### 4b. Reset link bad or old

- Title: "This link has expired"
- Body: "Links work once and for a short time. Ask for a new one."
- Button: "Send a new link" (goes to 4a). Link: "Back to log in".

---

## 5. Update password (from the reset link)

- **Purpose:** set a new password.
- **Next action:** "Save password".
- **Fields:** New password (show/hide). One field only. A confirm field adds friction and show/hide covers typos.

| State | What the user sees |
|---|---|
| Checking link | "Checking your link…" with a spinner. `role="status"`. |
| Idle | Title, rule, field, button. |
| Loading | Button reads "Saving…". |
| Error: too short | Under field: "Use at least [N] characters." |
| Error: same as old or too weak (if the provider says so) | "Pick a different password. Try a longer one." |
| Error: link ended while typing | Go to 4b. Keep nothing typed. |
| Error: other | "Something went wrong on our side. Try again in a moment." |
| Success | Go to Matches (or Upload if no profile). Toast: "Password saved. You're logged in." For `super_admin`, MFA challenge comes first (screen 8). |

**Copy**
- Title: "Choose a new password"
- Button: "Save password"

**Focus and VoiceOver**
- Focus moves to the title once the link check ends, then to the field.
- Other devices: security-expert decides if other sessions end (open question 4). If they do, tell the user: "We logged you out on other devices."

---

## 6. Continue with Google

**Placement:** above the email form on Sign up and Log in, full width, then a divider "or". Reason: one tap beats typing on a phone. It also keeps one clear primary path per area.

**Branding (must follow):** the button must follow Google's sign-in branding guidelines: https://developers.google.com/identity/branding-guidelines (date read: **not read, to verify 2026-11-25**). Sable must check the page for logo, colours, text, size and spacing before build. Until then:
- Use the official Google asset. Do not redraw or recolour the "G".
- Use Google's approved wording. "Continue with Google" is the wording named in the plan (to verify against the page).
- Our own button styles must not alter the Google button.
- Do not put Liquid Glass on this button.
- Height 44 pt or more. Check that Google's size rules allow it.

| State | What the user sees |
|---|---|
| Idle | Google button, enabled. |
| Loading | After the tap, the page leaves for Google. Back here: "Taking you to Google…" The button is disabled. |
| Cancel or Back at Google | Return to the screen the user came from. **No error.** Show a calm note: "You didn't finish signing in with Google. You can try again or use your email." The form is ready. |
| Error from Google or our server | "We couldn't sign you in with Google. Try again or use your email." No provider codes. |
| Success | Same as Log in success. First time: land on Upload. |

**Same email as an existing password account:** show the success path or the same neutral error. Do not say "this email has a password account" (it reveals the email exists). Open question 5.

**Focus and VoiceOver**
- Name: "Continue with Google, button". Not just "Google".
- On return from Google, focus goes to the page title, or to the cancel note (`role="status"`).
- Must work on Android and desktop. No SF Symbols or Apple marks.

---

## 7. super_admin: set up MFA (enrol)

- **Who:** only `super_admin` accounts without a verified authenticator. Regular users never see this.
- **Purpose:** pair an authenticator app so the Agents page can open.
- **Full page, not a sheet.** It is a multi-step task (HIG: long flows use full screens). No way to skip. Allowed exits: "Log out".
- **Steps:** 1 Scan or type the code. 2 Enter the 6-digit code. 3 Done.

### 7a. Scan

| Element | Spec |
|---|---|
| Title | "Set up your authenticator app" |
| Body | "Open an authenticator app. Scan this code." |
| QR code | At least 200 px. White quiet zone around it. Alt text: "QR code for your authenticator app. A text code is below if you can't scan." |
| Manual code | Label: "Can't scan? Type this code in your app instead." The secret shows in a read-only field in groups of four, with a "Copy code" button (44 pt). |
| Button | "Next" |

**States:** loading ("Making your code…", `role="status"`) · ready · error ("We couldn't make your code. Try again." with "Try again" button).

**Rules**
- Show the QR and secret only on this screen. Never log them, never put them in a URL, never keep them after the step. Security-expert to confirm.
- Order puts the manual code before the QR in the reading order for screen reader users. They can't see the QR. Keep both visible.

### 7b. Confirm

- Field: "6-digit code" (see code input rules below). Button: "Verify and turn on".
- Link: "Back" to 7a (shows the same QR if the factor is pending).

| State | What the user sees |
|---|---|
| Idle | Field focused. |
| Loading | "Checking…" |
| Error: wrong code | "That code didn't work. Wait for a new one and try again." |
| Error: expired or too many tries | "Too many tries. Wait a minute and try again." |
| Success | Screen 7c. |

### 7c. Done

- Title: "Your authenticator is on"
- Body: "You will enter a code each time you log in."
- Button: "Continue" (go to the Agents page).

**Code input rules (7b, 8, 9)**
- One text field, not six boxes. `inputmode="numeric"`, `autocomplete="one-time-code"`, `pattern="[0-9]*"`, `maxlength=6`. One field works with paste, autofill and screen readers.
- Label: "6-digit code". Hint: "Open your authenticator app. Type the code you see."
- Submit on the button, and on Return. Do not auto-submit at 6 digits (it surprises screen reader users). Open question 6.
- Errors use `role="alert"`. Keep the field filled so the user can fix a typo.

**Focus and VoiceOver**
- 7a: focus on the title, then the manual code field, then the Next button.
- Step indicator text: "Step 1 of 2". Not colour only.
- After Verify success, focus moves to the 7c title.

**Recovery (open question 7):** if the user loses the phone, they cannot reach the Agents page. The project lead resets the factor in the Supabase dashboard (runbook owner: security-expert). The screen says nothing about this. The doc needs a plain line on the help page.

---

## 8. super_admin: MFA challenge (each login)

- **Purpose:** prove it's the same person, after the password or Google step.
- **Full page.** Shown right after Log in success for a `super_admin` with MFA.
- **Fields:** 6-digit code. Buttons: "Verify", link "Log out".

| State | What the user sees |
|---|---|
| Idle | Title "Enter your code", body "Open your authenticator app. Type the 6-digit code." |
| Loading | Button reads "Checking…". |
| Error: wrong code | "That code didn't work. Wait for a new one and try again." |
| Error: too many tries | "Too many tries. Wait a minute and try again." |
| Error: session ended | "Your session ended. Log in again." Button: "Log in". |
| Success | Go to where the user was going (Agents page or Matches). |

Focus and VoiceOver: focus on the field on load, with the title read first (`aria-labelledby`). Use the code input rules above.

---

## 9. Step-up re-auth before Approve

- **Purpose:** confirm it's really the project lead before a change goes to `main` (ADR 0002).
- **When:** on tapping "Approve" if the last check is too old. Window length: **open question 8** (old rule was 10 minutes).
- **Pattern:** one sheet over the diff viewer. Medium detent, with a grabber. Buttons: "Cancel" and the primary action. No Done button (HIG: don't pair all three). Swipe down cancels. Only one sheet is open at a time. Close any other sheet first.
- **Fields:** Password (for password accounts) or "Continue with Google" (for Google accounts, which leaves the page and returns to the same proposal). Then the 6-digit code.

| State | What the user sees |
|---|---|
| Idle | Title "Confirm it's you", body "Approving changes the live app. Enter your password and code." Primary button: "Confirm and approve". |
| Loading | "Checking…". Buttons are disabled. |
| Error: wrong password or code | "That didn't work. Check your password and code and try again." Do not say which one. |
| Error: too many tries | "Too many tries. Wait a minute and try again." |
| Error: session ended | "Your session ended. Log in again." Proposal stays open. |
| Cancel | Sheet closes. Approve is not sent. Focus returns to the Approve button. |
| Success | Sheet closes. The approval runs. Status "Approved. Saving the change…" (`role="status"`). |

Focus and VoiceOver
- Sheet is a `<dialog>` opened with `showModal()`. Focus goes to the title, then the first field. Escape cancels.
- The grabber has the name "Resize sheet" and works with VoiceOver actions.
- Focus is trapped in the sheet and returns to Approve on close.
- Make sure the sticky bars do not hide the focused field (WCAG 2.4.11).

---

## 10. Agents page: "not available" for non-admins

- **Who sees it:** any signed-in user without `super_admin`, or without MFA, who opens the Agents URL.
- **Goal:** plain and neutral. It must not hint at what exists, who can see it, or how to get access.
- **Tab bar:** the Agents tab does not show for regular users. The screen shows only when someone types or follows the URL.
- **Fields:** none. One button.

| State | What the user sees |
|---|---|
| Only state | Title "This page isn't available". Body "Go back to your matches." Button "Back to matches". |
| Signed out | Go to Log in first. After login, a regular user lands here. A `super_admin` goes on to MFA (screen 8). |

**Never say**
- "Admin", "agents", "console", "permission", "role", "forbidden", "403", "you don't have access".
- The page must read the same as any unknown page (same wording as the app's missing-page screen). Security-expert to confirm the 403 for users does not leak in the page text or title. Page `<title>`: "Page not available".

Focus and VoiceOver: focus on the title. Button is 44 pt. Reads as "Back to matches, button".

---

## Where users go after auth

| Moment | Next screen |
|---|---|
| Sign up confirmed | Upload (first match in 60 s or less) |
| Log in, has profile | Matches |
| Log in, no profile | Upload |
| Password reset done | Matches or Upload |
| Log out | Log in |

Open question 9: can people upload and see matches before they make an account?

## Copy list (for `apps/web/src/content/`)

Keys are proposals. All strings are meant for grade 8 or lower. I have not run `copy-readability.mjs` on them (no shell in this task). Run it when the strings go into the catalog.

| Key | Text |
|---|---|
| auth.error.credentials | That email and password don't match. Try again or reset your password. |
| auth.error.rate | Too many tries. Wait a minute and try again. |
| auth.error.generic | Something went wrong on our side. Try again in a moment. |
| auth.error.offline | You're offline. Connect to the internet and try again. |
| auth.error.email | Enter an email like name@example.com. |
| auth.error.passwordShort | Use at least [N] characters. |
| auth.error.linkExpired | This link has expired. Ask for a new one. |
| auth.error.google | We couldn't sign you in with Google. Try again or use your email. |
| auth.google.cancel | You didn't finish signing in with Google. You can try again or use your email. |
| auth.checkEmail.title | Check your email |
| auth.signup.checkEmail.body | If you can sign up with [email], we sent a link there. Open it to finish. |
| auth.reset.checkEmail.body | If [email] has an account, we sent a link to reset your password. It can take a minute. |
| auth.resend.done | We sent it again. Check your spam folder too. |
| auth.logout.done | You're logged out. |
| auth.password.saved | Password saved. You're logged in. |
| auth.mfa.code.error | That code didn't work. Wait for a new one and try again. |
| auth.stepup.error | That didn't work. Check your password and code and try again. |
| auth.stepup.title | Confirm it's you |
| auth.stepup.body | Approving changes the live app. Enter your password and code. |
| auth.notAvailable.title | This page isn't available |
| auth.notAvailable.body | Go back to your matches. |

## Open questions

1. **Password rule.** What minimum length and other rules? Needs `security-expert` and the Supabase facts from T1. Copy has an [N] slot.
2. **Unconfirmed email on log in.** I show the same no-match message. This may leave a real user stuck. Option: also send a fresh confirm email silently. Needs security-expert.
3. **Device cache on log out.** Who clears cached matches and profile, and how? `mobile-pwa-expert`.
4. **Other sessions after a password reset.** End them or not? `security-expert`.
5. **Google and password with the same email.** What does Supabase do (link, or make two accounts)? Needs T1 and security-expert. Copy depends on it.
6. **Auto-submit on 6 digits.** I chose no, for screen reader users. `accessibility-specialist` to confirm.
7. **Lost authenticator.** No self-serve recovery is designed. Lead to confirm that a dashboard reset is acceptable, and security-expert to write the runbook.
8. **Step-up window.** How long after a check does Approve stay open (old rule: 10 minutes)? Open question 1 in the plan, owned by security-expert.
9. **Account before upload?** The 60-second goal (upload to first match) is easier if upload comes before sign up. Needs the project lead and privacy review (ADR 0004).
10. **Google button rules.** I could not read the branding page. Sable or the orchestrator should fetch it and fix the wording, size and logo rules before build.
11. **Resend wait.** 60 seconds is a guess until Supabase email limits are confirmed (T1).
