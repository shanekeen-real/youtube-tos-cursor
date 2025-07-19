"use client";
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

import { checkUserCanExport } from '@/lib/subscription-utils';
import { 
  Button,
  generateCSV, 
  generatePDF, 
  downloadFile, 
  generateFilename,
  type AnalysisData,
  type ExportOptions 
} from '@/lib/imports';
import { Download, FileText, FileSpreadsheet, Settings, Check, Lock, X, Shield, Zap } from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';
import Link from 'next/link';
import { useToastContext } from '@/contexts/ToastContext';

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  data: AnalysisData;
}

export default function ExportModal({ open, onClose, data }: ExportModalProps) {
  const { data: session } = useSession();
  const { showSuccess, showError } = useToastContext();
  const [format, setFormat] = useState<'pdf' | 'csv'>('pdf');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [includeContent, setIncludeContent] = useState(false);
  const [includeSuggestions, setIncludeSuggestions] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<string>('');
  const [canExport, setCanExport] = useState(false);
  const [exportError, setExportError] = useState<string>('');

  // Check export permissions when modal opens
  useEffect(() => {
    const checkExportPermissions = async () => {
      if (!session?.user?.id) {
        setCanExport(false);
        setExportError('Please sign in to export reports.');
        return;
      }

      try {
        const response = await fetch('/api/get-user-profile');
        if (response.ok) {
          const data = await response.json();
          const profile = data.userProfile;
          const exportCheck = checkUserCanExport(profile);
          setCanExport(exportCheck.canExport);
          setExportError(exportCheck.reason || '');
        } else {
          setCanExport(false);
          setExportError('User profile not found.');
        }
      } catch (err) {
        console.error('Failed to check export permissions:', err);
        setCanExport(false);
        setExportError('Failed to verify export permissions.');
      }
    };

    if (open) {
      checkExportPermissions();
    }
  }, [open, session?.user?.id]);

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
    if (!canExport) {
      setExportError('Export functionality is not available on your current plan.');
      return;
    }

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
      showSuccess('Export Successful', `Your ${format.toUpperCase()} report has been downloaded successfully.`);
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress('');
        onClose();
      }, 1000);

    } catch (error) {
      console.error('Export failed:', error);
      setExportProgress('Export failed. Please try again.');
      showError('Export Failed', 'Failed to generate export. Please try again.');
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

  // Show error state if export is not allowed
  if (!canExport) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xl max-w-md w-full overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <Lock className="w-4 h-4 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Export Not Available</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {/* Content */}
          <div className="p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Upgrade Required</h3>
              <p className="text-gray-600 mb-4">{exportError}</p>
              <p className="text-sm text-gray-500">
                Export functionality is available on Pro and Enterprise plans.
              </p>
            </div>
            
            <div className="flex gap-3">
              <Button onClick={onClose} variant="outlined" className="flex-1">
                Close
              </Button>
              <Button onClick={() => window.location.href = '/pricing'} className="flex-1">
                <Zap className="w-4 h-4 mr-2" />
                Upgrade Plan
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Download className="w-4 h-4 text-yellow-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Export Analysis</h2>
              <p className="text-sm text-gray-600">Download your analysis report</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
            disabled={isExporting}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Format Selection */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Export Format</h3>
            <div className="space-y-2">
              {formatOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <label
                    key={option.id}
                    className={`relative flex items-start p-4 border rounded-xl cursor-pointer transition-all ${
                      format === option.id
                        ? 'border-yellow-500 bg-yellow-50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
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
                        format === option.id ? 'border-yellow-500' : 'border-gray-300'
                      }`}>
                        {format === option.id && (
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        )}
                      </div>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        format === option.id ? 'bg-yellow-100' : 'bg-gray-100'
                      }`}>
                        <Icon className={`w-4 h-4 ${format === option.id ? 'text-yellow-600' : 'text-gray-600'}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{option.label}</span>
                          {option.recommended && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
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
                <label key={option.id} className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={option.checked}
                    onChange={(e) => option.onChange(e.target.checked)}
                    className="mt-1 w-4 h-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
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
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                <span className="text-sm text-yellow-800 font-medium">{exportProgress}</span>
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
