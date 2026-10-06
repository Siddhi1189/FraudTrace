import {
  generateDeterministicBrief,
  answerQuestionDeterministically,
} from './deterministicFallback.js';

const PROMPT_VERSION = 'v1.0.0';

/**
 * Builds the system instructions and user prompt for generating an investigation brief.
 */
function buildBriefPrompt(evidenceSnapshot) {
  return `You are FraudTrace AI Investigation Copilot, an investigative assistant for financial fraud analysts.
Your duty is to explain evidence that FraudTrace has already discovered. You do NOT make final fraud decisions.
You MUST follow these strict safety rules:
1. ONLY make claims grounded in the provided Evidence Catalog.
2. NEVER say that an entity is "guilty of fraud", "definitely committed fraud", or issue a final fraud verdict.
3. Every finding MUST cite one or more valid evidence IDs from the Evidence Catalog (e.g. ["E-ALERT-1", "E-TX-1"]).
4. Return your output strictly as a JSON object with this schema:
{
  "executiveSummary": "Concise overview of the case investigation evidence",
  "findings": [
    {
      "id": "F-1",
      "claim": "Specific factual finding or pattern observation",
      "evidenceIds": ["E-ALERT-1"],
      "category": "FACTUAL_EVIDENCE" | "SUSPICIOUS_INDICATOR" | "INTERPRETATION"
    }
  ],
  "suspiciousIndicators": ["string"],
  "entityRoles": [
    {
      "entityId": "ACC-XXX",
      "role": "Description of role in network",
      "supportingEvidenceIds": ["E-ACC-1"]
    }
  ],
  "timelineAnalysis": "Chronological assessment of transaction velocity and flow",
  "limitations": ["Any uncertainties, missing data, or scope bounds"],
  "recommendations": ["Suggested next steps for the analyst"]
}

EVIDENCE CATALOG:
${JSON.stringify(evidenceSnapshot.evidenceCatalog, null, 2)}

DERIVED FACTS:
${JSON.stringify(evidenceSnapshot.derivedFacts, null, 2)}
`;
}

/**
 * Builds the system instructions and user prompt for answering a case question.
 */
function buildQaPrompt(question, evidenceSnapshot) {
  return `You are FraudTrace AI Investigation Copilot.
Answer the analyst's question based strictly and exclusively on the provided Evidence Catalog.
Rules:
1. If the evidence catalog does not contain sufficient facts to answer the question, return:
   {
     "answer": "Insufficient evidence available for this question.",
     "evidenceIds": [],
     "confidence": "INSUFFICIENT_EVIDENCE",
     "unsupportedReason": "The evidence catalog contains no information regarding this query."
   }
2. Never invent accounts, transactions, or assumptions.
3. Every grounded claim must include supporting evidence IDs.
4. Output strictly as JSON.

QUESTION: "${question}"

EVIDENCE CATALOG:
${JSON.stringify(evidenceSnapshot.evidenceCatalog, null, 2)}
`;
}

/**
 * Invokes the configured LLM or executes the deterministic fallback if the API key is not present.
 *
 * @param {Object} options
 * @param {'BRIEF' | 'QA'} options.type - 'BRIEF' or 'QA'
 * @param {Object} options.evidenceSnapshot - Ground truth evidence snapshot
 * @param {string} [options.question] - Analyst question (for QA)
 * @returns {Promise<{ structuredOutput: Object, model: string, promptVersion: string, isFallback: boolean }>}
 */
export async function executeAiQuery({ type, evidenceSnapshot, question }) {
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.LLM_MODEL || 'gemini-1.5-flash';

  // If GEMINI_API_KEY is not configured, immediately use deterministic fallback
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
    if (type === 'QA') {
      const output = answerQuestionDeterministically(question, evidenceSnapshot);
      return {
        structuredOutput: output,
        model: 'deterministic-fallback',
        promptVersion: PROMPT_VERSION,
        isFallback: true,
      };
    } else {
      const output = generateDeterministicBrief(evidenceSnapshot);
      return {
        structuredOutput: output,
        model: 'deterministic-fallback',
        promptVersion: PROMPT_VERSION,
        isFallback: true,
      };
    }
  }

  // LLM path: call Google Gemini REST endpoint using Node native fetch
  try {
    const prompt = type === 'QA' ? buildQaPrompt(question, evidenceSnapshot) : buildBriefPrompt(evidenceSnapshot);
    const endpointUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent`;

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      console.warn(`[Gemini API] Returned status ${response.status}. Reverting to deterministic fallback.`);
      throw new Error(`Gemini API returned status ${response.status}`);
    }

    const data = await response.json();
    const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textOutput) {
      throw new Error('Gemini API returned empty response candidate');
    }

    // Strip code fences if present (I7)
    let cleanJson = textOutput.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.slice(7);
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.slice(3);
    }
    if (cleanJson.endsWith('```')) {
      cleanJson = cleanJson.slice(0, -3);
    }
    cleanJson = cleanJson.trim();

    const parsedOutput = JSON.parse(cleanJson);

    // Validate response shape (I7)
    if (!parsedOutput || typeof parsedOutput !== 'object') {
      throw new Error('Gemini response is not a valid JSON object');
    }
    if (type === 'QA' && typeof parsedOutput.answer !== 'string') {
      throw new Error('Gemini QA response missing required "answer" property');
    }
    if (type === 'BRIEF' && (!Array.isArray(parsedOutput.findings) || typeof parsedOutput.executiveSummary !== 'string')) {
      throw new Error('Gemini Brief response missing required "findings" or "executiveSummary"');
    }

    return {
      structuredOutput: parsedOutput,
      model: modelName,
      promptVersion: PROMPT_VERSION,
      isFallback: false,
    };
  } catch (err) {
    console.warn(`[AI Copilot] LLM call failed (${err.message}). Activating deterministic fallback.`);
    if (type === 'QA') {
      const fallbackOutput = answerQuestionDeterministically(question, evidenceSnapshot);
      return {
        structuredOutput: fallbackOutput,
        model: 'deterministic-fallback',
        promptVersion: PROMPT_VERSION,
        isFallback: true,
      };
    } else {
      const fallbackOutput = generateDeterministicBrief(evidenceSnapshot);
      return {
        structuredOutput: fallbackOutput,
        model: 'deterministic-fallback',
        promptVersion: PROMPT_VERSION,
        isFallback: true,
      };
    }
  }
}
