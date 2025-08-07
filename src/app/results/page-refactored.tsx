"use client";
import React, { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, FileText, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { 
  Card,
  Button,
  ExportModal,
  useResultsData,
  useResultsPermissions,
  useResultsNavigation,
  useResultsExport,
  ResultsSummary,
  ResultsHeader,
  TabNavigation,
  OverviewTab,
  LoadingSpinner,
  ErrorState
} from '@/lib/imports';

function ResultsPageContent() {
  const router = useRouter();
  const { data, loading, error, status } = useResultsData();
  const { canExport, canAccessAIDetection, getSuggestionLimit } = useResultsPermissions();
  const { activeTab, setActiveTab, tabs } = useResultsNavigation();
  const { exportModalOpen, openExportModal, closeExportModal } = useResultsExport();

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading analysis results..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <ErrorState 
              error={error}
              onRetry={() => window.location.reload()}
              showCancel={true}
              onCancel={() => router.push('/')}
            />
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

            {/* TODO: Extract other tabs */}
            {activeTab === 'details' && (
              <div className="text-center py-12">
                <p className="text-gray-500">Details tab - to be extracted</p>
              </div>
            )}

            {activeTab === 'suggestions' && (
              <div className="text-center py-12">
                <p className="text-gray-500">Suggestions tab - to be extracted</p>
              </div>
            )}

            {activeTab === 'ai-detection' && (
              <div className="text-center py-12">
                <p className="text-gray-500">AI Detection tab - to be extracted</p>
              </div>
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
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    }>
      <ResultsPageContent />
    </Suspense>
  );
} 