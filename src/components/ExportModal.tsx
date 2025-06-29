"use client";
import React, { useState, useEffect } from 'react';
import Button from './Button';
import { 
  generateCSV, 
  generatePDF, 
  downloadFile, 
  generateFilename,
  type AnalysisData,
  type ExportOptions 
} from '@/lib/export-utils';
import { Download, FileText, FileSpreadsheet, Settings, Check } from 'lucide-react';

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  data: AnalysisData;
}

export default function ExportModal({ open, onClose, data }: ExportModalProps) {
  const [format, setFormat] = useState<'pdf' | 'csv'>('pdf');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [includeContent, setIncludeContent] = useState(false);
  const [includeSuggestions, setIncludeSuggestions] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<string>('');

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [open, onClose]);

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress('Preparing export...');

    try {
      const options: ExportOptions = {
        format,
        includeMetadata,
        includeContent,
        includeSuggestions,
      };

      let content: string | Blob;
      let mimeType: string;
      let fileExtension: string;

      if (format === 'csv') {
        setExportProgress('Generating CSV...');
        content = generateCSV(data, options);
        mimeType = 'text/csv';
        fileExtension = 'csv';
      } else {
        setExportProgress('Generating PDF...');
        content = await generatePDF(data, options);
        mimeType = 'application/pdf';
        fileExtension = 'pdf';
      }

      setExportProgress('Downloading file...');
      const filename = generateFilename(data, fileExtension);
      downloadFile(content, filename, mimeType);

      setExportProgress('Export completed!');
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress('');
        onClose();
      }, 1000);

    } catch (error) {
      console.error('Export failed:', error);
      setExportProgress('Export failed. Please try again.');
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress('');
      }, 2000);
    }
  };

  const formatOptions = [
    {
      id: 'pdf' as const,
      label: 'PDF Report',
      description: 'Professional formatted report with all details',
      icon: FileText,
      recommended: true,
    },
    {
      id: 'csv' as const,
      label: 'CSV Data',
      description: 'Spreadsheet format for data analysis',
      icon: FileSpreadsheet,
      recommended: false,
    },
  ];

  const contentOptions = [
    {
      id: 'metadata',
      label: 'Include Analysis Metadata',
      description: 'Model used, processing time, analysis mode',
      checked: includeMetadata,
      onChange: setIncludeMetadata,
    },
    {
      id: 'content',
      label: 'Include Analyzed Content',
      description: 'Original video transcript or text content',
      checked: includeContent,
      onChange: setIncludeContent,
    },
    {
      id: 'suggestions',
      label: 'Include Recommendations',
      description: 'Actionable suggestions and improvements',
      checked: includeSuggestions,
      onChange: setIncludeSuggestions,
    },
  ];

  // Don't render anything if modal is not open
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Download className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Export Analysis</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isExporting}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Format Selection */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Export Format</h3>
            <div className="space-y-2">
              {formatOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <label
                    key={option.id}
                    className={`relative flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                      format === option.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="format"
                      value={option.id}
                      checked={format === option.id}
                      onChange={(e) => setFormat(e.target.value as 'pdf' | 'csv')}
                      className="sr-only"
                      disabled={isExporting}
                    />
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        format === option.id ? 'border-blue-500' : 'border-gray-300'
                      }`}>
                        {format === option.id && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                      <Icon className="w-5 h-5 text-gray-600" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{option.label}</span>
                          {option.recommended && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              Recommended
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{option.description}</p>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Content Options */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Content Options</h3>
            <div className="space-y-3">
              {contentOptions.map((option) => (
                <label key={option.id} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={option.checked}
                    onChange={(e) => option.onChange(e.target.checked)}
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    disabled={isExporting}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{option.label}</div>
                    <div className="text-xs text-gray-500">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Export Progress */}
          {isExporting && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-blue-800">{exportProgress}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outlined"
              onClick={onClose}
              disabled={isExporting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="flex-1 flex items-center justify-center gap-2"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Export {format.toUpperCase()}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
