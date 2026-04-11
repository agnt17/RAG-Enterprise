export const PROMPT_TEMPLATES = {
  law_firm: [
    { label: "Summarize Judgment", prompt: "Summarize this judgment in a structured format: Facts, Issues, Arguments by Petitioner, Arguments by Respondent, Court's Analysis, and Final Held." },
    { label: "Extract Parties", prompt: "Extract all parties mentioned in this document — petitioners, respondents, judges, advocates, and any other named parties." },
    { label: "List Key Dates", prompt: "List all important dates mentioned in this document along with the events associated with each date." },
    { label: "Find Penalty Clauses", prompt: "Identify all penalty clauses, fines, damages, or monetary obligations mentioned in this document." },
    { label: "Identify Precedents", prompt: "List all case laws, precedents, and statutes cited in this document with their context." },
  ],
  ca_firm: [
    { label: "Summarize Financials", prompt: "Provide a structured summary of the financial information in this document including key figures, ratios, and notable items." },
    { label: "List Compliance Issues", prompt: "Identify all compliance requirements, regulatory obligations, and any potential compliance gaps mentioned in this document." },
    { label: "Extract Key Figures", prompt: "Extract all important numerical figures — amounts, percentages, dates, and quantities — from this document." },
    { label: "Find Risk Factors", prompt: "Identify all risk factors, contingent liabilities, and potential concerns mentioned in this document." },
  ],
  general: [
    { label: "Summarize Document", prompt: "Provide a comprehensive summary of this document covering all key points, findings, and conclusions." },
    { label: "Extract Key Points", prompt: "List the most important points, facts, and takeaways from this document." },
    { label: "Find Action Items", prompt: "Identify all action items, recommendations, deadlines, and next steps mentioned in this document." },
    { label: "List Key Terms", prompt: "Extract and define all important terms, definitions, and technical concepts used in this document." },
  ],
}

export function getTemplatesForUser(user) {
  if (user?.profession && PROMPT_TEMPLATES[user.profession]) {
    return PROMPT_TEMPLATES[user.profession]
  }
  return PROMPT_TEMPLATES.general
}
