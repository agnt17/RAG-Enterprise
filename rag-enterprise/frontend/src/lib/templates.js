export const PROMPT_TEMPLATES = {
  law_firm: {
    audience: "For law firms",
    title: "Legal research cockpit",
    description: "Ready-made prompts for judgments, petitions, contracts, and case-law review.",
    accent: "from-sky-500/20 via-cyan-500/10 to-transparent",
    icon: "scale",
    templates: [
      {
        label: "Summarize Judgment",
        prompt: "Summarize this judgment in a structured format: Facts, Issues, Arguments by Petitioner, Arguments by Respondent, Court's Analysis, and Final Held.",
        summary: "Structured case-note output for quick review.",
        category: "Judgment",
      },
      {
        label: "Extract Parties",
        prompt: "Extract all parties mentioned in this document — petitioners, respondents, judges, advocates, and any other named parties.",
        summary: "Pull every named stakeholder into one clean list.",
        category: "Entities",
      },
      {
        label: "List Key Dates",
        prompt: "List all important dates mentioned in this document along with the events associated with each date.",
        summary: "Timeline extraction for hearings, filings, and orders.",
        category: "Timeline",
      },
      {
        label: "Find Penalty Clauses",
        prompt: "Identify all penalty clauses, fines, damages, or monetary obligations mentioned in this document.",
        summary: "Surface every financial obligation or exposure.",
        category: "Risk",
      },
      {
        label: "Identify Precedents",
        prompt: "List all case laws, precedents, and statutes cited in this document with their context.",
        summary: "Capture citations and why they matter here.",
        category: "Authorities",
      },
    ],
  },
  ca_firm: {
    audience: "For CA firms",
    title: "Compliance analysis desk",
    description: "Designed for financial statements, audits, tax notices, and regulatory review.",
    accent: "from-emerald-500/20 via-teal-500/10 to-transparent",
    icon: "calculator",
    templates: [
      {
        label: "Summarize Financials",
        prompt: "Provide a structured summary of the financial information in this document including key figures, ratios, and notable items.",
        summary: "Condense numbers, ratios, and headline observations.",
        category: "Financials",
      },
      {
        label: "List Compliance Issues",
        prompt: "Identify all compliance requirements, regulatory obligations, and any potential compliance gaps mentioned in this document.",
        summary: "Highlight filing, tax, or regulatory gaps fast.",
        category: "Compliance",
      },
      {
        label: "Extract Key Figures",
        prompt: "Extract all important numerical figures — amounts, percentages, dates, and quantities — from this document.",
        summary: "Turn dense statements into a number sheet.",
        category: "Metrics",
      },
      {
        label: "Find Risk Factors",
        prompt: "Identify all risk factors, contingent liabilities, and potential concerns mentioned in this document.",
        summary: "Expose liabilities and audit risks in one pass.",
        category: "Risk",
      },
    ],
  },
  general: {
    audience: "For any document",
    title: "Document intelligence panel",
    description: "Fast prompts for summaries, action items, and practical extraction.",
    accent: "from-indigo-500/20 via-sky-500/10 to-transparent",
    icon: "sparkles",
    templates: [
      {
        label: "Summarize Document",
        prompt: "Provide a comprehensive summary of this document covering all key points, findings, and conclusions.",
        summary: "A polished overview you can read in under a minute.",
        category: "Summary",
      },
      {
        label: "Extract Key Points",
        prompt: "List the most important points, facts, and takeaways from this document.",
        summary: "Extract only the decisions and facts that matter.",
        category: "Highlights",
      },
      {
        label: "Find Action Items",
        prompt: "Identify all action items, recommendations, deadlines, and next steps mentioned in this document.",
        summary: "Surface next actions and follow-ups instantly.",
        category: "Tasks",
      },
      {
        label: "List Key Terms",
        prompt: "Extract and define all important terms, definitions, and technical concepts used in this document.",
        summary: "Build a clean glossary from the source.",
        category: "Glossary",
      },
    ],
  },
}

export function getTemplatesForUser(user) {
  if (user?.profession && PROMPT_TEMPLATES[user.profession]) {
    return PROMPT_TEMPLATES[user.profession]
  }
  return PROMPT_TEMPLATES.general
}
