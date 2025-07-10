// Test script for JSON parsing fixes
const testJSONParsing = () => {
  // Simulate the problematic JSON from the logs
  const problematicJSON = `{
    "categories": {
      "LEGAL_COMPLIANCE_COPYRIGHT": {
        "risk_score": 20,
        "confidence": 80,
        "violations": ["Use of copyrighted material"],
        "severity": "LOW",
        "explanation": "The video references the movie "Home Alone" and uses the address of the house from the movie, which could be considered a use of copyrighted material."
      },
      "LEGAL_COMPLIANCE_TRADEMARK": {
        "risk_score": 20,
        "confidence": 80,
        "violations": ["Use of trademarked material"],
        "severity": "LOW",
        "explanation": "The video references the movie "Home Alone" and uses the names of the characters Harry and Marv, which could be considered a use of trademarked material."
      }
    }
  }`;

  console.log("Testing JSON parsing fixes...\n");
  console.log("Original problematic JSON:");
  console.log(problematicJSON);
  console.log("\n" + "=".repeat(80) + "\n");

  // Test the fix logic
  let sanitized = problematicJSON;
  
  // Test the comprehensive quote fixing approach
  console.log("Testing comprehensive quote fixing...");
  
  // Strategy 1: Fix specific fields
  sanitized = sanitized.replace(
    /("(?:explanation|violations|severity|content_type|target_audience|language_detected)":\s*")((?:[^"\\]|\\.)*)"/g,
    (match, prefix, content) => {
      const fixed = content.replace(/(?<!\\)"/g, '\\"');
      return prefix + fixed + '"';
    }
  );
  
  // Strategy 2: Smart quote fixing that only targets string values, not keys
  sanitized = sanitized.replace(
    /:\s*"([^"]*(?:"[^"]*)*)"/g,
    (match, content) => {
      const fixed = content.replace(/(?<!\\)"/g, '\\"');
      return `: "${fixed}"`;
    }
  );
  
  console.log("After fixing quotes:");
  console.log(sanitized);
  console.log("\n" + "=".repeat(80) + "\n");

  // Test parsing
  try {
    const parsed = JSON.parse(sanitized);
    console.log("✅ Successfully parsed JSON!");
    console.log("Parsed result:");
    console.log(JSON.stringify(parsed, null, 2));
  } catch (error) {
    console.log("❌ Failed to parse JSON:", error.message);
  }
};

testJSONParsing(); 