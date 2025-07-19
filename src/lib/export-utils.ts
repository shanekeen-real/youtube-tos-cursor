import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import { 
  EXPORT_FORMATS, 
  MIME_TYPES, 
  FILE_EXTENSIONS, 
  getMimeType,
  getFileExtension,
  generateFilename as generateFilenameFromConfig
} from '@/lib/constants/export-config';

export interface ExportOptions {
  includeMetadata?: boolean;
  includeContent?: boolean;
  includeSuggestions?: boolean;
  format: 'pdf' | 'csv';
}

export interface AnalysisData {
  id?: string;
  url?: string;
  title?: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  riskScore: number;
  flaggedSections: string[];
  suggestions: any[];
  createdAt?: string;
  userId?: string;
  context_analysis?: {
    content_type: string;
    target_audience: string;
    monetization_impact: number;
    content_length: number;
    language_detected: string;
  };
  policy_categories?: {
    [category: string]: {
      risk_score: number;
      confidence: number;
      violations: string[];
      severity: 'LOW' | 'MEDIUM' | 'HIGH';
      explanation: string;
    };
  };
  highlights?: {
    category: string;
    risk: string;
    score: number;
    confidence: number;
  }[];
  analysis_metadata?: {
    model_used: string;
    analysis_timestamp: string;
    processing_time_ms: number;
    content_length: number;
    analysis_mode: string;
  };
  analyzed_content?: string;
  analysis_source?: string;
}

// Helper function to ensure value is an array
function toArray(val: any): any[] {
  if (Array.isArray(val)) return val;
  if (val === undefined || val === null) return [];
  if (typeof val === 'string') return [val];
  return Array.from(val);
}

// Generate CSV export
export function generateCSV(data: AnalysisData, options: ExportOptions): string {
  const csvData: any[] = [];

  // Summary section
  csvData.push(['YouTube TOS Analysis Report']);
  csvData.push(['Generated:', new Date().toLocaleString()]);
  csvData.push(['Content Title:', data.title || 'N/A']);
  csvData.push(['Content URL:', data.url || 'N/A']);
  csvData.push([]);

  // Risk summary
  csvData.push(['Risk Summary']);
  csvData.push(['Risk Level', data.riskLevel]);
  csvData.push(['Risk Score', `${data.riskScore}/100`]);
  csvData.push(['Flagged Sections Count', toArray(data.flaggedSections).length]);
  csvData.push(['Suggestions Count', toArray(data.suggestions).length]);
  csvData.push([]);

  // Content analysis
  if (data.context_analysis && options.includeMetadata) {
    csvData.push(['Content Analysis']);
    csvData.push(['Content Type', data.context_analysis.content_type]);
    csvData.push(['Target Audience', data.context_analysis.target_audience]);
    csvData.push(['Monetization Impact', `${data.context_analysis.monetization_impact}%`]);
    csvData.push(['Content Length', `${data.context_analysis.content_length} words`]);
    csvData.push(['Language', data.context_analysis.language_detected]);
    csvData.push([]);
  }

  // Policy categories
  if (data.policy_categories) {
    csvData.push(['Policy Category Analysis']);
    csvData.push(['Category', 'Risk Score', 'Confidence', 'Severity', 'Violations', 'Explanation']);
    
    Object.entries(data.policy_categories)
      .sort((a, b) => b[1].risk_score - a[1].risk_score)
      .forEach(([category, analysis]) => {
        csvData.push([
          category.replace(/_/g, ' '),
          `${analysis.risk_score}%`,
          `${analysis.confidence}%`,
          analysis.severity,
          analysis.violations?.join('; ') || 'None',
          analysis.explanation
        ]);
      });
    csvData.push([]);
  }

  // Highlights
  if (data.highlights && toArray(data.highlights).length > 0) {
    csvData.push(['Top Risk Highlights']);
    csvData.push(['Category', 'Risk', 'Score', 'Confidence']);
    toArray(data.highlights).forEach(highlight => {
      csvData.push([
        highlight.category,
        highlight.risk,
        highlight.score,
        highlight.confidence
      ]);
    });
    csvData.push([]);
  }

  // Suggestions
  if (data.suggestions && toArray(data.suggestions).length > 0 && options.includeSuggestions) {
    csvData.push(['Recommendations']);
    csvData.push(['Title', 'Description', 'Priority', 'Impact Score']);
    toArray(data.suggestions).forEach(suggestion => {
      csvData.push([
        suggestion.title,
        suggestion.text,
        suggestion.priority,
        suggestion.impact_score
      ]);
    });
    csvData.push([]);
  }

  // Flagged sections
  if (data.flaggedSections && toArray(data.flaggedSections).length > 0) {
    csvData.push(['Flagged Sections']);
    toArray(data.flaggedSections).forEach((section, index) => {
      csvData.push([`Section ${index + 1}`, section]);
    });
    csvData.push([]);
  }

  // Analyzed content
  if (data.analyzed_content && options.includeContent) {
    csvData.push(['Analyzed Content']);
    csvData.push([data.analyzed_content]);
    csvData.push([]);
  }

  // Metadata
  if (data.analysis_metadata && options.includeMetadata) {
    csvData.push(['Analysis Metadata']);
    csvData.push(['Model Used', data.analysis_metadata.model_used]);
    csvData.push(['Analysis Timestamp', data.analysis_metadata.analysis_timestamp]);
    csvData.push(['Processing Time', `${data.analysis_metadata.processing_time_ms} ms`]);
    csvData.push(['Content Length', `${data.analysis_metadata.content_length} chars`]);
    csvData.push(['Analysis Mode', data.analysis_metadata.analysis_mode]);
    csvData.push(['Analysis Source', data.analysis_source || 'N/A']);
  }

  return Papa.unparse(csvData);
}

// Generate PDF export
export async function generatePDF(data: AnalysisData, options: ExportOptions): Promise<Blob> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let yPosition = margin;

  // Helper function to add text with word wrapping
  const addWrappedText = (text: string, y: number, fontSize: number = 12): number => {
    pdf.setFontSize(fontSize);
    const lines = pdf.splitTextToSize(text, contentWidth);
    pdf.text(lines, margin, y);
    return y + (lines.length * fontSize * 0.4);
  };

  // Helper function to add section header
  const addSectionHeader = (title: string, y: number): number => {
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, margin, y);
    return y + 8;
  };

  // Helper function to add subsection
  const addSubsection = (title: string, y: number): number => {
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, margin, y);
    return y + 6;
  };

  // Helper function to add normal text
  const addText = (text: string, y: number): number => {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    return addWrappedText(text, y, 10);
  };

  // Helper function to add key-value pair
  const addKeyValue = (key: string, value: string, y: number): number => {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${key}:`, margin, y);
    
    const keyWidth = pdf.getTextWidth(`${key}:`);
    pdf.setFont('helvetica', 'normal');
    const valueLines = pdf.splitTextToSize(value, contentWidth - keyWidth - 5);
    pdf.text(valueLines, margin + keyWidth + 5, y);
    
    return y + (valueLines.length * 4);
  };

  // Title
  yPosition = addSectionHeader('YouTube TOS Analysis Report', yPosition);
  yPosition = addText(`Generated: ${new Date().toLocaleString()}`, yPosition + 5);
  yPosition = addText(`Content: ${data.title || 'N/A'}`, yPosition + 3);
  if (data.url) {
    yPosition = addText(`URL: ${data.url}`, yPosition + 3);
  }
  yPosition += 10;

  // Risk Summary
  yPosition = addSubsection('Risk Summary', yPosition);
  yPosition = addKeyValue('Risk Level', data.riskLevel, yPosition + 3);
  yPosition = addKeyValue('Risk Score', `${data.riskScore}/100`, yPosition + 3);
  yPosition = addKeyValue('Flagged Sections', `${toArray(data.flaggedSections).length}`, yPosition + 3);
  yPosition = addKeyValue('Suggestions', `${toArray(data.suggestions).length}`, yPosition + 3);
  yPosition += 10;

  // Content Analysis
  if (data.context_analysis && options.includeMetadata) {
    yPosition = addSubsection('Content Analysis', yPosition);
    yPosition = addKeyValue('Content Type', data.context_analysis.content_type, yPosition + 3);
    yPosition = addKeyValue('Target Audience', data.context_analysis.target_audience, yPosition + 3);
    yPosition = addKeyValue('Monetization Impact', `${data.context_analysis.monetization_impact}%`, yPosition + 3);
    yPosition = addKeyValue('Content Length', `${data.context_analysis.content_length} words`, yPosition + 3);
    yPosition = addKeyValue('Language', data.context_analysis.language_detected, yPosition + 3);
    yPosition += 10;
  }

  // Policy Categories
  if (data.policy_categories) {
    yPosition = addSubsection('Policy Category Analysis', yPosition);
    
    Object.entries(data.policy_categories)
      .sort((a, b) => b[1].risk_score - a[1].risk_score)
      .forEach(([category, analysis]) => {
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = margin;
        }
        
        yPosition = addText(`${category.replace(/_/g, ' ')} (${analysis.risk_score}% risk)`, yPosition + 3);
        yPosition = addText(`Confidence: ${analysis.confidence}% | Severity: ${analysis.severity}`, yPosition + 2);
        if (analysis.violations && analysis.violations.length > 0) {
          yPosition = addText(`Violations: ${analysis.violations.join(', ')}`, yPosition + 2);
        }
        yPosition = addText(analysis.explanation, yPosition + 2);
        yPosition += 5;
      });
  }

  // Highlights
  if (data.highlights && toArray(data.highlights).length > 0) {
    if (yPosition > 250) {
      pdf.addPage();
      yPosition = margin;
    }
    
    yPosition = addSubsection('Top Risk Highlights', yPosition);
    toArray(data.highlights).forEach(highlight => {
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = margin;
      }
      
      yPosition = addText(`${highlight.category}: ${highlight.risk}`, yPosition + 3);
      yPosition = addText(`Score: ${highlight.score} | Confidence: ${highlight.confidence}`, yPosition + 2);
      yPosition += 3;
    });
  }

  // Suggestions
  if (data.suggestions && toArray(data.suggestions).length > 0 && options.includeSuggestions) {
    if (yPosition > 250) {
      pdf.addPage();
      yPosition = margin;
    }
    
    yPosition = addSubsection('Recommendations', yPosition);
    toArray(data.suggestions).forEach((suggestion, index) => {
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = margin;
      }
      
      yPosition = addText(`${index + 1}. ${suggestion.title}`, yPosition + 3);
      yPosition = addText(suggestion.text, yPosition + 2);
      yPosition = addText(`Priority: ${suggestion.priority} | Impact: ${suggestion.impact_score}`, yPosition + 2);
      yPosition += 5;
    });
  }

  // Flagged Sections
  if (data.flaggedSections && toArray(data.flaggedSections).length > 0) {
    if (yPosition > 250) {
      pdf.addPage();
      yPosition = margin;
    }
    
    yPosition = addSubsection('Flagged Sections', yPosition);
    toArray(data.flaggedSections).forEach((section, index) => {
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = margin;
      }
      
      yPosition = addText(`Section ${index + 1}:`, yPosition + 3);
      yPosition = addText(section, yPosition + 2);
      yPosition += 5;
    });
  }

  // Analyzed Content
  if (data.analyzed_content && options.includeContent) {
    if (yPosition > 250) {
      pdf.addPage();
      yPosition = margin;
    }
    
    yPosition = addSubsection('Analyzed Content', yPosition);
    yPosition = addText(data.analyzed_content, yPosition + 3);
  }

  // Metadata
  if (data.analysis_metadata && options.includeMetadata) {
    if (yPosition > 250) {
      pdf.addPage();
      yPosition = margin;
    }
    
    yPosition = addSubsection('Analysis Metadata', yPosition);
    yPosition = addKeyValue('Model Used', data.analysis_metadata.model_used, yPosition + 3);
    yPosition = addKeyValue('Analysis Timestamp', data.analysis_metadata.analysis_timestamp, yPosition + 3);
    yPosition = addKeyValue('Processing Time', `${data.analysis_metadata.processing_time_ms} ms`, yPosition + 3);
    yPosition = addKeyValue('Content Length', `${data.analysis_metadata.content_length} chars`, yPosition + 3);
    yPosition = addKeyValue('Analysis Mode', data.analysis_metadata.analysis_mode, yPosition + 3);
    if (data.analysis_source) {
      yPosition = addKeyValue('Analysis Source', data.analysis_source, yPosition + 3);
    }
  }

  return pdf.output('blob');
}

// Download file utility
export function downloadFile(content: string | Blob, filename: string, mimeType: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Generate filename
export function generateFilename(data: AnalysisData, format: string): string {
  const title = data.title || 'analysis';
  return generateFilenameFromConfig(title, format as any);
}
