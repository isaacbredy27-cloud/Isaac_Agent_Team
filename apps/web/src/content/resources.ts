// Resources page content. Every URL below is cited in docs/ or knowledge/ (read 2026-11-25),
// or was named by the project lead (repo, mcp-api, /guide/). Owner: Wren.

export interface Resource {
  readonly title: string;
  readonly url: string;
  /** One plain sentence: why we rely on this link. */
  readonly why: string;
}

export interface ResourceCategory {
  readonly id: string;
  readonly title: string;
  readonly items: readonly Resource[];
}

export const resources: readonly ResourceCategory[] = [
  {
    id: "project",
    title: "This project",
    items: [
      { title: "Source code on GitHub", url: "https://github.com/isaacbredy27-cloud/Isaac_Agent_Team", why: "The full code, docs and decisions for this app." },
      { title: "MCP API site", url: "https://mcp-api.netlify.app/", why: "A related site from the same team." },
      { title: "Step-by-step guide", url: "/guide/", why: "Set up Supabase, Netlify and the Agents page, one step at a time." },
    ],
  },
  {
    id: "netlify",
    title: "Netlify (hosting)",
    items: [
      { title: "Functions: get started", url: "https://docs.netlify.com/build/functions/get-started/", why: "Our server code runs as Netlify Functions." },
      { title: "Functions: configuration", url: "https://docs.netlify.com/build/functions/configuration/", why: "Routes, limits and the netlify.toml settings for functions." },
      { title: "Functions: API", url: "https://docs.netlify.com/build/functions/api/", why: "The request and context objects our functions use." },
      { title: "Background functions", url: "https://docs.netlify.com/build/functions/background-functions/", why: "Long jobs that outlast a normal request." },
      { title: "Scheduled functions", url: "https://docs.netlify.com/build/functions/scheduled-functions/", why: "How we collect jobs every 2 hours." },
      { title: "Netlify Blobs", url: "https://docs.netlify.com/build/data-and-storage/netlify-blobs/", why: "Where we keep job data and audit logs. Never resumes." },
      { title: "Environment variables", url: "https://docs.netlify.com/build/environment-variables/overview/", why: "Where secrets live. Never in the browser." },
      { title: "Rate limiting", url: "https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/", why: "Protects public and paid routes from heavy use." },
      { title: "Build hooks", url: "https://docs.netlify.com/build/configure-builds/build-hooks/", why: "How deploys start from outside Netlify." },
      { title: "Custom headers", url: "https://docs.netlify.com/manage/routing/headers/", why: "Security and cache headers for the site." },
      { title: "Netlify pricing", url: "https://www.netlify.com/pricing/", why: "The Free plan limits that shape this app." },
    ],
  },
  {
    id: "supabase",
    title: "Supabase (sign in)",
    items: [
      { title: "Auth overview", url: "https://supabase.com/docs/guides/auth", why: "How sign up and log in work." },
      { title: "Passwords", url: "https://supabase.com/docs/guides/auth/passwords", why: "Email and password sign in, and password reset." },
      { title: "Login with Google", url: "https://supabase.com/docs/guides/auth/social-sign-in/auth-google", why: "How to turn on Continue with Google." },
      { title: "Redirect URLs", url: "https://supabase.com/docs/guides/auth/redirect-urls", why: "Which addresses may receive a signed-in user." },
      { title: "Multi-factor authentication", url: "https://supabase.com/docs/guides/auth/auth-mfa", why: "Admins must use an authenticator app." },
      { title: "MFA with TOTP", url: "https://supabase.com/docs/guides/auth/auth-mfa/totp", why: "The six-digit code flow we use." },
      { title: "Row Level Security", url: "https://supabase.com/docs/guides/database/postgres/row-level-security", why: "Keeps each person's data and role safe." },
      { title: "API keys", url: "https://supabase.com/docs/guides/getting-started/api-keys", why: "We use the publishable key only. Never a secret key." },
      { title: "getClaims", url: "https://supabase.com/docs/reference/javascript/auth-getclaims", why: "How our functions check a sign-in token." },
      { title: "JWTs", url: "https://supabase.com/docs/guides/auth/jwts", why: "What is inside a sign-in token." },
      { title: "Signing keys", url: "https://supabase.com/docs/guides/auth/signing-keys", why: "How tokens are signed and checked." },
      { title: "Auth rate limits", url: "https://supabase.com/docs/guides/auth/rate-limits", why: "Why we show 'Too many tries' after many attempts." },
      { title: "Managing user data", url: "https://supabase.com/docs/guides/auth/managing-user-data", why: "How profiles link to accounts." },
      { title: "Supabase pricing", url: "https://supabase.com/pricing", why: "Plan limits that affect sign in." },
    ],
  },
  {
    id: "google",
    title: "Google sign in",
    items: [
      { title: "Sign in with Google branding guidelines", url: "https://developers.google.com/identity/branding-guidelines", why: "Rules for how the Continue with Google button must look." },
    ],
  },
  {
    id: "anthropic",
    title: "Anthropic Claude API",
    items: [
      { title: "Claude docs", url: "https://platform.claude.com/docs/", why: "Home of all Claude API docs." },
      { title: "Messages API", url: "https://platform.claude.com/docs/en/api/messages/create", why: "How agents and explanations call Claude." },
      { title: "Streaming", url: "https://platform.claude.com/docs/en/build-with-claude/streaming", why: "How chat replies appear as they are written." },
      { title: "Models overview", url: "https://platform.claude.com/docs/en/about-claude/models/overview", why: "Which models each agent can use." },
      { title: "Prompt caching", url: "https://platform.claude.com/docs/en/build-with-claude/prompt-caching", why: "Keeps repeated prompts fast and cheap." },
      { title: "Structured outputs", url: "https://platform.claude.com/docs/en/build-with-claude/structured-outputs", why: "Makes resume extraction return clean data." },
      { title: "PDF support", url: "https://platform.claude.com/docs/en/build-with-claude/pdf-support", why: "Optional path for reading PDF resumes." },
      { title: "Rate limits", url: "https://platform.claude.com/docs/en/api/rate-limits", why: "Limits that shape how we queue work." },
    ],
  },
  {
    id: "github",
    title: "GitHub (saving approved changes)",
    items: [
      { title: "REST API", url: "https://docs.github.com/en/rest", why: "How the app talks to the repo." },
      { title: "Repository contents", url: "https://docs.github.com/en/rest/repos/contents", why: "Read and write single files." },
      { title: "Git trees", url: "https://docs.github.com/en/rest/git/trees", why: "Save many files in one commit." },
      { title: "Git commits", url: "https://docs.github.com/en/rest/git/commits", why: "Create the commit for an approved change." },
      { title: "Git refs", url: "https://docs.github.com/en/rest/git/refs", why: "Move main to the new commit." },
      { title: "Fine-grained personal access tokens", url: "https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens", why: "How to make the one token this app uses." },
      { title: "REST API rate limits", url: "https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api", why: "Limits on how often we can call GitHub." },
    ],
  },
  {
    id: "jobs",
    title: "Job sources",
    items: [
      { title: "Greenhouse Job Board API", url: "https://developers.greenhouse.io/job-board.html", why: "Public job posts from companies that use Greenhouse." },
      { title: "Lever Postings API", url: "https://github.com/lever/postings-api", why: "Public job posts from companies that use Lever." },
      { title: "USAJOBS API", url: "https://developer.usajobs.gov/", why: "Federal job posts." },
      { title: "USAJOBS Search API reference", url: "https://developer.usajobs.gov/api-reference/get-api-search", why: "How we search federal jobs." },
      { title: "schema.org JobPosting", url: "https://schema.org/JobPosting", why: "The shared shape for a job post." },
      { title: "Google JobPosting guide", url: "https://developers.google.com/search/docs/appearance/structured-data/job-posting", why: "Which job fields employers should publish." },
    ],
  },
  {
    id: "market",
    title: "Pay and market data",
    items: [
      { title: "BLS Occupational Employment and Wage Statistics", url: "https://www.bls.gov/oes/", why: "Source of our pay estimates." },
      { title: "BLS OEWS, Orlando area", url: "https://www.bls.gov/oes/2023/may/oes_36740.htm", why: "Orlando pay ranges for finance jobs." },
      { title: "BLS Orlando wages news release", url: "https://www.bls.gov/regions/southeast/news-release/2025/occupationalemploymentandwages_orlando_20250425.htm", why: "Newer Orlando wage figures." },
      { title: "BLS Occupational Outlook: financial analysts", url: "https://www.bls.gov/ooh/business-and-financial/financial-analysts.htm", why: "What financial analysts do and need." },
      { title: "O*NET OnLine", url: "https://www.onetonline.org/", why: "Skills and duties for each occupation." },
      { title: "Orlando major employers", url: "https://news.orlando.org/projects/major-employers/", why: "Who hires in the Orlando area." },
    ],
  },
  {
    id: "pwa",
    title: "Install and offline (PWA)",
    items: [
      { title: "web.dev: installation prompt", url: "https://web.dev/learn/pwa/installation-prompt", why: "How the Install button works." },
      { title: "web.dev: web app manifest", url: "https://web.dev/learn/pwa/web-app-manifest", why: "The file that makes the app installable." },
      { title: "MDN: Progressive web apps", url: "https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps", why: "Overview of installable web apps." },
      { title: "MDN: making PWAs installable", url: "https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable", why: "What a browser needs before it offers Install." },
      { title: "MDN: web app manifest", url: "https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest", why: "Every manifest field explained." },
      { title: "MDN: using service workers", url: "https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers", why: "How offline pages work." },
      { title: "MDN: caching", url: "https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching", why: "What we cache and what we never cache." },
      { title: "MDN: offline and background operation", url: "https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation", why: "How the app behaves with no connection." },
    ],
  },
  {
    id: "design",
    title: "Design and access",
    items: [
      { title: "Apple HIG: tab bars", url: "https://developer.apple.com/design/human-interface-guidelines/tab-bars", why: "Why the bottom bar only holds sections." },
      { title: "Apple HIG: sheets", url: "https://developer.apple.com/design/human-interface-guidelines/sheets", why: "How filters and the confirm step open." },
      { title: "Apple HIG: accessibility", url: "https://developer.apple.com/design/human-interface-guidelines/accessibility", why: "Touch size, text size and contrast." },
      { title: "Apple HIG: materials", url: "https://developer.apple.com/design/human-interface-guidelines/materials", why: "The glass look, used sparingly." },
      { title: "Apple HIG: color", url: "https://developer.apple.com/design/human-interface-guidelines/color", why: "Color is never the only cue." },
      { title: "WCAG 2.2", url: "https://www.w3.org/TR/WCAG22/", why: "The accessibility standard we meet." },
      { title: "Plain Language Guidelines", url: "https://www.plainlanguage.gov/guidelines/", why: "How we write every screen." },
    ],
  },
];

/** Flat list, handy for tests and link checks. */
export const allResources: readonly Resource[] = resources.flatMap((c) => c.items);

export const resourcesCopy = {
  title: "Resources",
  intro: "These are the sources this app relies on. Each link says why.",
  externalHint: "Opens in a new tab.",
} as const;
