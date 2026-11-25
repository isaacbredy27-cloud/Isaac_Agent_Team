// How it Works page content. Weights come from docs/match-scoring.md, model D (section 5), bands section 6.
// Owner: Wren. Grade 8 or lower.

export interface HowSection {
  readonly id: string;
  readonly title: string;
  readonly paragraphs: readonly string[];
  readonly bullets?: readonly string[];
}

export interface ScoreWeight {
  readonly label: string;
  readonly points: number;
}

/** Model D. Sums to 100. */
export const scoreWeights: readonly ScoreWeight[] = [
  { label: "Required skills", points: 30 },
  { label: "Years of experience", points: 20 },
  { label: "Education", points: 10 },
  { label: "Licenses and certificates", points: 10 },
  { label: "Industry experience", points: 10 },
  { label: "Preferred skills", points: 10 },
  { label: "Title and level", points: 5 },
  { label: "Location", points: 5 },
];

export const scoreBands = [
  { range: "80 to 100", label: "Strong Match", icon: "●" },
  { range: "60 to 79", label: "Moderate Match", icon: "◐" },
  { range: "0 to 59", label: "Weak Match", icon: "○" },
] as const;

export const howItWorks = {
  title: "How it Works",
  intro: "Upload your resume. See which Orlando finance jobs fit. Here is what happens in between.",
  nextStep: "Ready? Upload your resume.",
  nextAction: "Upload your resume",
  weightsHeading: "How the score adds up",
  weightsIntro: "The score is out of 100. These parts count.",
  weightsNote:
    "A missing license or clearance can cap the score. If a job does not state a rule, that part does not count against you.",
  bandsHeading: "Match levels",
  sections: [
    {
      id: "upload",
      title: "1. You upload your resume",
      paragraphs: [
        "Choose a PDF or Word file. You can also paste the text. Files can be up to 5 MB.",
      ],
    },
    {
      id: "parse",
      title: "2. We read it in memory",
      paragraphs: [
        "We read your file and pull out skills, titles, licenses, years and education.",
        "We do not save the file. We delete it after reading. Your profile stays on your device.",
      ],
    },
    {
      id: "collect",
      title: "3. We collect jobs every 2 hours",
      paragraphs: [
        "We gather recent finance jobs in the Orlando area from public job sources.",
        "You see when the list was last updated.",
      ],
    },
    {
      id: "score",
      title: "4. Code works out your score",
      paragraphs: [
        "A fixed set of rules scores each job from 0 to 100. The same resume and job always give the same score.",
        "No AI guesses your score. Code does the math.",
      ],
    },
    {
      id: "explain",
      title: "5. We explain the score",
      paragraphs: [
        "Every score comes with reasons. You see what matches and what is missing.",
        "Claude may help write the explanation in plain words. If it is off, you still see the facts.",
      ],
    },
    {
      id: "gaps",
      title: "6. We show your skill gaps",
      paragraphs: [
        "We look across your best matches. We list skills that come up often and are not on your resume.",
      ],
    },
    {
      id: "recommend",
      title: "7. We suggest what to do next",
      paragraphs: [
        "For each job you get a next step. It may be to apply now. It may be to learn a skill or start a license.",
        "A weak match is not a no. It is a plan.",
      ],
    },
    {
      id: "privacy",
      title: "Your privacy",
      paragraphs: ["Your resume is yours."],
      bullets: [
        "Your resume is never public.",
        "We use it only to match you with jobs.",
        "We do not log it or let agents read it.",
        "You can delete your profile at any time.",
      ],
    },
    {
      id: "console",
      title: "The Agent Console",
      paragraphs: [
        "Project admins can chat with the project's agents. Agents can propose changes to the app.",
        "Nothing goes live on its own. An admin reads the changes, then taps Approve. The admin confirms with a code from an authenticator app.",
        "Approved changes save straight to the live app. Rejected changes are thrown away. Every approved change can be undone.",
      ],
    },
  ] as readonly HowSection[],
} as const;
