// Re-export the main analysis function to maintain API compatibility
export { performEnhancedAnalysis } from './analysis-core';

// Re-export types for external use
export type { 
  BasicAnalysisResult, 
  AnalysisOptions, 
  AnalysisContext, 
  AnalysisProcessingResult,
  EmergencyFallbackResult 
} from './analysis-types';

// Re-export utility functions for advanced use cases
export { 
  prepareAnalysisContext, 
  processRiskyContent, 
  calculateFinalMetrics, 
  createAnalysisMetadata 
} from './analysis-utils';

// Re-export fallback functions for advanced use cases
export { 
  performBasicAnalysis, 
  createEmergencyFallbackResult, 
  handleAnalysisError 
} from './analysis-fallback'; 