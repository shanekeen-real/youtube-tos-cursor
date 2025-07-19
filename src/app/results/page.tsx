"use client";
import React, { Suspense } from 'react';
import { AlertTriangle, FileText, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/lib/imports';
import { Button } from '@/lib/imports';
import { 
  ExportModal,
  useResultsData,
  useResultsPermissions,
  useResultsNavigation,
  useResultsExport,
  ResultsSummary,
  ResultsHeader,
  TabNavigation,
  OverviewTab,
  DetailsTab,
  SuggestionsTab,
  AIDetectionTab
} from '@/lib/imports';

function ResultsPageContent() {
  const { data, loading, error, status } = useResultsData();
  const { canExport, canAccessAIDetection, getSuggestionLimit } = useResultsPermissions();
  const { activeTab, setActiveTab, tabs } = useResultsNavigation();
  const { exportModalOpen, openExportModal, closeExportModal } = useResultsExport();

  // Calculate suggestion limit
  const suggestionLimit = getSuggestionLimit(data);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analysis results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <AlertTriangle className="w-12 h-12 text-risk mx-auto mb-4" />
            <h2 className="text-title font-semibold text-gray-800 mb-2">Analysis Error</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="flex gap-3 justify-center">
              <Link href="/">
                <Button variant="outlined" className="inline-flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Home
                </Button>
              </Link>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-title font-semibold text-gray-800 mb-2">No Data Available</h2>
            <p className="text-gray-600 mb-6">No scan data was found for this analysis.</p>
            <Link href="/">
              <Button className="inline-flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-display font-bold text-gray-800 mb-2">
            Analysis Results
          </h1>
          <p className="text-subtitle text-gray-600">
            Detailed analysis results for your content
          </p>
        </div>

        {/* Summary Cards */}
        <ResultsSummary data={data} />

        {/* Action Buttons Section */}
        <ResultsHeader canExport={canExport} onExportClick={openExportModal} />

        {/* Main Content */}
        <Card>
          {/* Tab Navigation */}
          <TabNavigation
            activeTab={activeTab}
            onTabChange={setActiveTab}
            data={data}
            canAccessAIDetection={canAccessAIDetection}
            tabs={tabs}
          />

          {/* Tab Content - Fixed Height Container */}
          <div className="min-h-[600px]">
            {activeTab === 'overview' && (
              <OverviewTab data={data} />
            )}

            {activeTab === 'details' && (
              <DetailsTab data={data} canAccessAIDetection={canAccessAIDetection} />
            )}

            {activeTab === 'suggestions' && (
              <SuggestionsTab data={data} suggestionLimit={suggestionLimit} />
            )}

            {activeTab === 'ai-detection' && (
              <AIDetectionTab data={data} />
            )}
          </div>
        </Card>

        {/* Export Modal */}
        {data && canExport && (
          <ExportModal
            open={exportModalOpen}
            onClose={closeExportModal}
            data={data}
          />
        )}
      </div>
    </main>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ResultsPageContent />
    </Suspense>
  );
} 