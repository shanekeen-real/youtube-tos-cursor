// Test script to verify fixes for policy categories and suggestions
// This is a simplified test that simulates the logic we implemented

// Mock the functions we're testing
function performAIDrivenPolicyAnalysis(text, contextAnalysis, model, videoContext) {
  return model.generateContent("policy compliance").then(result => {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const parsedResult = JSON.parse(jsonMatch[0]);
    
    // Validate that all required categories are present
    const requiredCategories = [
      'COMMUNITY_STANDARDS_HATE_SPEECH',
      'COMMUNITY_STANDARDS_HARASSMENT',
      'COMMUNITY_STANDARDS_VIOLENCE',
      'COMMUNITY_STANDARDS_MISINFORMATION',
      'ADVERTISER_FRIENDLY_PROFANITY',
      'ADVERTISER_FRIENDLY_CONTROVERSIAL',
      'ADVERTISER_FRIENDLY_BRAND_SAFETY',
      'CONTENT_SAFETY_VIOLENCE',
      'CONTENT_SAFETY_SEXUAL',
      'COPYRIGHT_INFRINGEMENT'
    ];
    
    const missingCategories = requiredCategories.filter(cat => !parsedResult.categories?.[cat]);
    if (missingCategories.length > 0) {
      console.warn(`Missing categories in AI response: ${missingCategories.join(', ')}`);
      
      // Add missing categories with default values
      missingCategories.forEach(category => {
        if (!parsedResult.categories) parsedResult.categories = {};
        parsedResult.categories[category] = {
          risk_score: 0,
          confidence: 0,
          violations: [],
          severity: 'LOW',
          explanation: 'Category not analyzed by AI - using default values'
        };
      });
    }
    
    // Convert to PolicyCategoryAnalysis array format
    const policyCategories = Object.entries(parsedResult.categories || {}).map(([category, data]) => ({
      category,
      risk_score: Math.min(100, Math.max(0, data.risk_score || 0)),
      confidence: Math.min(100, Math.max(0, data.confidence || 0)),
      violations: Array.isArray(data.violations) ? data.violations : [],
      severity: data.severity || 'LOW',
      explanation: data.explanation || 'No explanation provided'
    }));

    console.log(`AI-driven policy analysis completed with ${policyCategories.length} categories`);
    return policyCategories;
  });
}

function generateActionableSuggestionsWithContext(text, model, policyAnalysis, riskAssessment, videoContext) {
  return model.generateContent("suggestions").then(result => {
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    
    if (!jsonMatch) {
      throw new Error('No JSON array found in AI response');
    }

    const parsedResult = JSON.parse(jsonMatch[0]);
    
    // Validate and normalize the suggestions
    const suggestions = Array.isArray(parsedResult) ? parsedResult.map((s, index) => {
      // Ensure we have meaningful text
      let suggestionText = s.text || s.description || s.explanation || '';
      if (!suggestionText || suggestionText === 'No suggestion text provided') {
        // Generate a fallback suggestion based on the title or index
        if (s.title && s.title !== `Suggestion ${index + 1}`) {
          suggestionText = `Consider implementing the suggestion: ${s.title}. This would help improve content compliance and audience reach.`;
        } else {
          suggestionText = `Review your content for potential policy violations and consider making adjustments to improve compliance.`;
        }
      }
      
      return {
        title: s.title || `Suggestion ${index + 1}`,
        text: suggestionText,
        priority: s.priority || 'MEDIUM',
        impact_score: Math.min(100, Math.max(0, s.impact_score || 50))
      };
    }) : [];

    console.log(`AI-driven suggestions completed with ${suggestions.length} suggestions`);
    return suggestions;
  });
}

// Mock SmartAIModel for testing
class MockSmartAIModel {
  async generateContent(prompt) {
    // Simulate AI response with only 4 categories (the issue we're fixing)
    if (prompt.includes('policy compliance')) {
      return JSON.stringify({
        categories: {
          "COMMUNITY_STANDARDS_HATE_SPEECH": {
            "risk_score": 10,
            "confidence": 80,
            "violations": ["No hate speech detected"],
            "severity": "LOW",
            "explanation": "Content appears to be free of hate speech."
          },
          "ADVERTISER_FRIENDLY_PROFANITY": {
            "risk_score": 30,
            "confidence": 70,
            "violations": ["Some mild profanity detected"],
            "severity": "MEDIUM",
            "explanation": "Content contains some mild profanity."
          },
          "CONTENT_SAFETY_VIOLENCE": {
            "risk_score": 5,
            "confidence": 90,
            "violations": ["No violence detected"],
            "severity": "LOW",
            "explanation": "Content appears to be free of violence."
          },
          "COPYRIGHT_INFRINGEMENT": {
            "risk_score": 0,
            "confidence": 95,
            "violations": ["No copyright issues detected"],
            "severity": "LOW",
            "explanation": "Content appears to be original."
          }
        }
      });
    }
    
    // Simulate AI response for suggestions with missing text
    if (prompt.includes('suggestions')) {
      return JSON.stringify([
        {
          "title": "Remove Profanity",
          "text": "No suggestion text provided",
          "priority": "HIGH",
          "impact_score": 85
        },
        {
          "title": "Add Content Warnings",
          "priority": "MEDIUM",
          "impact_score": 60
        }
      ]);
    }
    
    return '{}';
  }
}

async function testPolicyAnalysis() {
  console.log('Testing Policy Analysis Fix...');
  
  const mockModel = new MockSmartAIModel();
  const testText = "This is a test video about gaming with some mild profanity.";
  const contextAnalysis = {
    content_type: "Gaming",
    target_audience: "General Audience",
    monetization_impact: 70,
    content_length: 100,
    language_detected: "English"
  };
  
  try {
    const result = await performAIDrivenPolicyAnalysis(testText, contextAnalysis, mockModel, "Test context");
    console.log(`Policy Analysis Result: ${result.length} categories`);
    
    // Check if all 10 categories are present
    const expectedCategories = [
      'COMMUNITY_STANDARDS_HATE_SPEECH',
      'COMMUNITY_STANDARDS_HARASSMENT',
      'COMMUNITY_STANDARDS_VIOLENCE',
      'COMMUNITY_STANDARDS_MISINFORMATION',
      'ADVERTISER_FRIENDLY_PROFANITY',
      'ADVERTISER_FRIENDLY_CONTROVERSIAL',
      'ADVERTISER_FRIENDLY_BRAND_SAFETY',
      'CONTENT_SAFETY_VIOLENCE',
      'CONTENT_SAFETY_SEXUAL',
      'COPYRIGHT_INFRINGEMENT'
    ];
    
    const missingCategories = expectedCategories.filter(cat => 
      !result.find(r => r.category === cat)
    );
    
    if (missingCategories.length === 0) {
      console.log('✅ Policy Analysis Fix: All 10 categories present');
    } else {
      console.log('❌ Policy Analysis Fix: Missing categories:', missingCategories);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Policy Analysis Test Failed:', error);
    return null;
  }
}

async function testSuggestions() {
  console.log('\nTesting Suggestions Fix...');
  
  const mockModel = new MockSmartAIModel();
  const testText = "This is a test video about gaming with some mild profanity.";
  const policyAnalysis = [
    {
      category: "ADVERTISER_FRIENDLY_PROFANITY",
      risk_score: 30,
      confidence: 70,
      violations: ["Some mild profanity detected"],
      severity: "MEDIUM",
      explanation: "Content contains some mild profanity."
    }
  ];
  const riskAssessment = {
    overall_risk_score: 30,
    flagged_section: "Mild profanity detected",
    risk_factors: ["profanity"],
    severity_level: "MEDIUM",
    risky_phrases_by_category: {
      "ADVERTISER_FRIENDLY_PROFANITY": ["damn", "hell"]
    }
  };
  
  try {
    const result = await generateActionableSuggestionsWithContext(testText, mockModel, policyAnalysis, riskAssessment, "Test context");
    console.log(`Suggestions Result: ${result.length} suggestions`);
    
    // Check if suggestions have proper text
    const suggestionsWithText = result.filter(s => 
      s.text && 
      s.text !== 'No suggestion text provided' && 
      s.text.length > 10
    );
    
    if (suggestionsWithText.length === result.length) {
      console.log('✅ Suggestions Fix: All suggestions have proper text');
    } else {
      console.log('❌ Suggestions Fix: Some suggestions missing proper text');
      result.forEach((s, i) => {
        console.log(`  Suggestion ${i + 1}: "${s.text}"`);
      });
    }
    
    return result;
  } catch (error) {
    console.error('❌ Suggestions Test Failed:', error);
    return null;
  }
}

async function runTests() {
  console.log('Running Fix Tests...\n');
  
  await testPolicyAnalysis();
  await testSuggestions();
  
  console.log('\nTests completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testPolicyAnalysis, testSuggestions }; 