/**
 * Robust Prompt Engineering Utilities
 * Designed to ensure AI models return structured JSON instead of narrative text
 */

export interface PromptConfig {
  enforceJsonFormat: boolean;
  maxRetries: number;
  retryDelayMs: number;
  enableFallbacks: boolean;
  logParsingAttempts: boolean;
}

/**
 * Creates a robust JSON-only prompt with multiple safety mechanisms
 */
export function createJsonOnlyPrompt(
  basePrompt: string,
  expectedSchema: string,
  exampleResponse: string,
  config: Partial<PromptConfig> = {}
): string {
  const defaultConfig: PromptConfig = {
    enforceJsonFormat: true,
    maxRetries: 3,
    retryDelayMs: 1000,
    enableFallbacks: true,
    logParsingAttempts: true,
    ...config
  };

  return `
${basePrompt}

CRITICAL INSTRUCTIONS - READ CAREFULLY:
1. You MUST respond with ONLY valid JSON. No text before or after the JSON object.
2. Do NOT include any explanations, commentary, or descriptive text outside the JSON.
3. Do NOT use markdown formatting (no \`\`\`json or \`\`\`).
4. Do NOT include any narrative or conversational text.
5. Start your response with { or [ and end with } or ].
6. All string values must escape quotes as \\".
7. No trailing commas allowed.
8. All numbers must be actual numbers, not strings.

EXPECTED JSON SCHEMA:
${expectedSchema}

EXAMPLE RESPONSE:
${exampleResponse}

VALIDATION CHECKLIST:
□ Response starts with { or [
□ Response ends with } or ]
□ No text before the opening brace/bracket
□ No text after the closing brace/bracket
□ All quotes in string values are properly escaped
□ No trailing commas
□ All numbers are actual numbers (not strings)
□ No markdown formatting
□ No explanations or commentary

FINAL WARNING: 
- Output ONLY the JSON object/array above
- Nothing else
- No explanations
- No commentary
- No additional text
- No markdown
- No narrative content

If you cannot provide a valid response, return an empty object {} or array [].
`;
}

/**
 * Creates a fallback prompt for when the primary prompt fails
 */
export function createFallbackPrompt(
  basePrompt: string,
  expectedSchema: string,
  errorContext: string
): string {
  return `
The previous response was invalid. Please try again with these strict requirements:

${basePrompt}

CRITICAL: You must respond with ONLY valid JSON. The previous response failed because: ${errorContext}

EXPECTED FORMAT:
${expectedSchema}

RULES:
1. Start with { or [
2. End with } or ]
3. No text outside the JSON
4. No explanations
5. No markdown
6. No narrative content

RESPOND WITH ONLY THE JSON OBJECT/ARRAY.
`;
}

/**
 * Creates a structured output prompt that's more likely to succeed
 */
export function createStructuredOutputPrompt(
  task: string,
  schema: unknown,
  context: string
): string {
  return `
You are a JSON-only response system. Your task is to ${task}.

CONTEXT:
${context}

REQUIRED OUTPUT FORMAT:
${JSON.stringify(schema, null, 2)}

INSTRUCTIONS:
1. Analyze the provided content
2. Return ONLY a valid JSON object matching the schema above
3. Do not include any text outside the JSON
4. Do not use markdown formatting
5. Do not provide explanations or commentary
6. If a field cannot be determined, use null or an empty string

RESPOND WITH ONLY THE JSON OBJECT.
`;
}

/**
 * Creates a prompt specifically for extracting structured data from narrative text
 */
export function createExtractionPrompt(
  narrativeText: string,
  targetSchema: string,
  extractionRules: string[]
): string {
  return `
You have received narrative text that should contain structured information. Extract the relevant data and return it as JSON.

NARRATIVE TEXT:
${narrativeText}

TARGET JSON SCHEMA:
${targetSchema}

EXTRACTION RULES:
${extractionRules.map(rule => `- ${rule}`).join('\n')}

INSTRUCTIONS:
1. Read the narrative text carefully
2. Extract information that matches the target schema
3. Return ONLY valid JSON matching the schema
4. Do not include any text outside the JSON
5. If information is missing, use null or empty values
6. Do not add explanations or commentary

RESPOND WITH ONLY THE JSON OBJECT.
`;
}

/**
 * Creates a validation prompt to check if a response is valid JSON
 */
export function createValidationPrompt(response: string): string {
  return `
Validate if the following response is valid JSON:

RESPONSE:
${response}

INSTRUCTIONS:
1. Check if the response is valid JSON
2. If valid, return: {"valid": true}
3. If invalid, return: {"valid": false, "error": "description of the issue"}
4. Do not include any other text

RESPOND WITH ONLY THE JSON OBJECT.
`;
}

/**
 * Creates a repair prompt to fix malformed JSON
 */
export function createRepairPrompt(malformedJson: string, expectedSchema: string): string {
  return `
The following JSON is malformed. Please repair it to match the expected schema:

MALFORMED JSON:
${malformedJson}

EXPECTED SCHEMA:
${expectedSchema}

INSTRUCTIONS:
1. Fix any syntax errors in the JSON
2. Ensure it matches the expected schema
3. Return ONLY the repaired JSON
4. Do not include any explanations or commentary
5. Do not use markdown formatting

RESPOND WITH ONLY THE REPAIRED JSON.
`;
}

/**
 * Creates a prompt for batch processing with structured output
 */
export function createBatchProcessingPrompt(
  items: unknown[],
  itemSchema: string,
  batchInstructions: string
): string {
  return `
Process the following items in batch and return structured results:

ITEMS TO PROCESS:
${JSON.stringify(items, null, 2)}

ITEM SCHEMA:
${itemSchema}

BATCH INSTRUCTIONS:
${batchInstructions}

INSTRUCTIONS:
1. Process each item according to the instructions
2. Return an array of results matching the item schema
3. Return ONLY valid JSON
4. Do not include any text outside the JSON
5. Do not use markdown formatting
6. Do not provide explanations or commentary

RESPOND WITH ONLY THE JSON ARRAY.
`;
} 