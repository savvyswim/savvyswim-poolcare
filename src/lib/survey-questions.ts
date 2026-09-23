/**
 * Questions for the /survey landing page.
 *
 * Answers are formatted into the lead notes so the office and the CRM see the
 * full survey next to the contact details, with no schema change.
 */

export type SurveyQuestion = {
  id: string;
  label: string;
  /** "single" = one choice, "multi" = pick up to maxPicks, "text" = open text. */
  kind: "single" | "multi" | "text";
  options?: readonly string[];
  maxPicks?: number;
  optional?: boolean;
  placeholder?: string;
  /** Only show this question when the named answer is one of these values. */
  showWhen?: { id: string; values: readonly string[] };
  /** Picking this option reveals a short text box, stored under `<id>_other`. */
  otherOption?: string;
  otherPlaceholder?: string;
};


export const SURVEY_QUESTIONS: readonly SurveyQuestion[] = [
  {
    id: "has_company",
    label: "Do you currently have a pool service company, or do you maintain your pool yourself?",
    kind: "single",
    options: ["Have a company", "Do it myself", "Mix of both"],
  },
  {
    id: "current_company",
    label: "Who do you currently use?",
    kind: "single",
    optional: true,
    options: [
      "Blue Haven",
      "ASP America's Swimming Pool Co",
      "Pool Troopers",
      "A local independent tech",
      "A neighbor or handyman",
      "I do not know the name",
      "Other",
    ],
    otherOption: "Other",
    otherPlaceholder: "Company name (optional)",
    showWhen: { id: "has_company", values: ["Have a company", "Mix of both"] },
  },

  {
    id: "monthly_spend",
    label: "How much do you pay now per month?",
    kind: "single",
    options: ["Under $100", "$100 to $150", "$150 to $200", "$200+", "Not sure"],
  },
  {
    id: "service_frequency",
    label: "How often does your current service come?",
    kind: "single",
    options: [
      "Weekly",
      "Every other week",
      "2 times a month",
      "3 times a month",
      "Not on a regular schedule",
    ],
  },
  {
    id: "priorities",
    label: "What matters most to you in a pool company? Pick your top 2.",
    kind: "multi",
    maxPicks: 2,
    options: [
      "Reliability, showing up on time",
      "Price",
      "Communication, updates, photos, texts",
      "Water quality, consistent chemical balance",
      "Trustworthy techs on your property when you are not home",
      "Easy billing, no surprise charges",
    ],
  },
  {
    id: "frustration",
    label: "What frustrates you most about pool service, past or current?",
    kind: "multi",
    optional: true,
    options: [
      "Missed or skipped visits",
      "Green or cloudy water",
      "No communication or updates",
      "Surprise charges",
      "Damage or careless work",
      "Hard to reach anyone",
      "Nothing really",
      "Other",
    ],
    otherOption: "Other",
    otherPlaceholder: "Tell us in your own words (optional)",
  },

  {
  {
    id: "switch_trigger",
    label: "What would make you switch companies, or start using one?",
    kind: "single",
    options: [
      "Better price",
      "Better communication and app updates",
      "A trial period or discount",
      "Nothing, happy with current setup",
    ],
  },
];

export type SurveyAnswers = Record<string, string | string[]>;

/** Only the questions that apply, given the answers so far. */
export function visibleQuestions(answers: SurveyAnswers): SurveyQuestion[] {
  return SURVEY_QUESTIONS.filter((q) => {
    if (!q.showWhen) return true;
    const current = answers[q.showWhen.id];
    return typeof current === "string" && q.showWhen.values.includes(current);
  });
}

/** Key holding the typed text when the "Other" option is picked. */
export function otherKey(id: string): string {
  return `${id}_other`;
}

/** Human readable block of the answers, stored with the lead. */
export function formatAnswers(answers: SurveyAnswers): string {
  return visibleQuestions(answers)
    .map((q) => {
      const value = answers[q.id];
      const picked = Array.isArray(value) ? [...value] : [];
      const typed = (answers[otherKey(q.id)] ?? "").toString().trim();
      if (q.otherOption && typed) {
        const labelled = `${q.otherOption}: ${typed}`;
        if (Array.isArray(value)) {
          const at = picked.indexOf(q.otherOption);
          if (at >= 0) picked[at] = labelled;
        } else if (value === q.otherOption) {
          return `${q.label}\n${labelled}`;
        }
      }
      const text = Array.isArray(value)
        ? picked.join(", ")
        : (value ?? "").toString().trim();
      return text ? `${q.label}\n${text}` : null;
    })
    .filter(Boolean)
    .join("\n\n");

}
