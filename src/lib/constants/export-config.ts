/**
 * Centralized constants for export configurations
 * These constants define file types, MIME types, and export options
 */

/**
 * Supported export formats
 */
export const EXPORT_FORMATS = {
  PDF: 'pdf',
  CSV: 'csv'
} as const;

export type ExportFormat = typeof EXPORT_FORMATS[keyof typeof EXPORT_FORMATS];

/**
 * MIME types for different file formats
 */
export const MIME_TYPES = {
  [EXPORT_FORMATS.PDF]: 'application/pdf',
  [EXPORT_FORMATS.CSV]: 'text/csv',
  JSON: 'application/json',
  TEXT: 'text/plain'
} as const;

/**
 * File extensions for different formats
 */
export const FILE_EXTENSIONS = {
  [EXPORT_FORMATS.PDF]: 'pdf',
  [EXPORT_FORMATS.CSV]: 'csv',
  JSON: 'json',
  TEXT: 'txt'
} as const;

/**
 * Export format options with metadata
 */
export const EXPORT_FORMAT_OPTIONS = [
  {
    id: EXPORT_FORMATS.PDF,
    label: 'PDF Report',
    description: 'Professional formatted report with all details',
    recommended: true,
    mimeType: MIME_TYPES[EXPORT_FORMATS.PDF],
    extension: FILE_EXTENSIONS[EXPORT_FORMATS.PDF]
  },
  {
    id: EXPORT_FORMATS.CSV,
    label: 'CSV Data',
    description: 'Spreadsheet format for data analysis',
    recommended: false,
    mimeType: MIME_TYPES[EXPORT_FORMATS.CSV],
    extension: FILE_EXTENSIONS[EXPORT_FORMATS.CSV]
  }
] as const;

/**
 * Content inclusion options for exports
 */
export const CONTENT_OPTIONS = [
  {
    id: 'metadata',
    label: 'Include Analysis Metadata',
    description: 'Model used, processing time, analysis mode',
    default: true
  },
  {
    id: 'content',
    label: 'Include Analyzed Content',
    description: 'Original video transcript or text content',
    default: false
  },
  {
    id: 'suggestions',
    label: 'Include Recommendations',
    description: 'Actionable suggestions and improvements',
    default: true
  }
] as const;

/**
 * Default export options
 */
export const DEFAULT_EXPORT_OPTIONS = {
  format: EXPORT_FORMATS.PDF,
  includeMetadata: true,
  includeContent: false,
  includeSuggestions: true
} as const;

/**
 * File naming patterns
 */
export const FILE_NAMING = {
  MAX_TITLE_LENGTH: 30,
  TITLE_CLEANUP_REGEX: /[^a-zA-Z0-9]/g,
  TITLE_REPLACEMENT: '_',
  TIMESTAMP_FORMAT: 'yyyy-MM-dd',
  DEFAULT_TITLE: 'analysis'
} as const;

/**
 * Performance configuration for exports
 */
export const EXPORT_PERFORMANCE = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  CHUNK_SIZE: 1024 * 1024, // 1MB chunks
  TIMEOUT: 30000, // 30 seconds
  MAX_RETRIES: 3
} as const;

/**
 * Utility function to get MIME type for format
 * @param format - The export format
 * @returns The corresponding MIME type
 */
export function getMimeType(format: ExportFormat): string {
  return MIME_TYPES[format];
}

/**
 * Utility function to get file extension for format
 * @param format - The export format
 * @returns The corresponding file extension
 */
export function getFileExtension(format: ExportFormat): string {
  return FILE_EXTENSIONS[format];
}

/**
 * Utility function to generate filename
 * @param title - The content title
 * @param format - The export format
 * @param timestamp - Optional timestamp
 * @returns Generated filename
 */
export function generateFilename(title: string, format: ExportFormat, timestamp?: string): string {
  const cleanTitle = title
    ? title.replace(FILE_NAMING.TITLE_CLEANUP_REGEX, FILE_NAMING.TITLE_REPLACEMENT)
        .substring(0, FILE_NAMING.MAX_TITLE_LENGTH)
    : FILE_NAMING.DEFAULT_TITLE;
  
  const date = timestamp || new Date().toISOString().split('T')[0];
  const extension = getFileExtension(format);
  
  return `${cleanTitle}_${date}.${extension}`;
} 