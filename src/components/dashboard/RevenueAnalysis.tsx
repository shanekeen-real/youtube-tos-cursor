import React from 'react';
import { DollarSign, TrendingUp, Shield, Calculator, AlertTriangle, RefreshCw, Settings } from 'lucide-react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { RevenueData, YouTubeChannel } from './types';

interface RevenueAnalysisProps {
  revenueData: RevenueData | null;
  revenueLoading: boolean;
  revenueError: string | null;
  ytChannel: YouTubeChannel | null;
  onSetupCPM: () => void;
  onRefresh: () => void;
}

export default function RevenueAnalysis({ 
  revenueData, 
  revenueLoading, 
  revenueError, 
  ytChannel, 
  onSetupCPM, 
  onRefresh 
}: RevenueAnalysisProps) {
  return (
    <Card className="flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-title font-semibold text-gray-800 flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-yellow-500" />
          Revenue at Risk
        </h2>
        {revenueData && !revenueData.setupRequired && (
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={revenueLoading}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Refresh Revenue Data"
              title="Refresh Revenue Data"
            >
              <RefreshCw className={`h-5 w-5 text-gray-500 ${revenueLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onSetupCPM}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Edit CPM Settings"
              title="Edit CPM Settings"
            >
              <Settings className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        )}
      </div>
      
      <div>
        {revenueLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading revenue data...</p>
            </div>
          </div>
        ) : !ytChannel ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calculator className="h-8 w-8 text-yellow-600" />
            </div>
            <h3 className="text-subtitle font-semibold text-gray-800 mb-2">Connect YouTube to Calculate Revenue at Risk</h3>
            <p className="text-gray-600 mb-6 max-w-md">
              The Revenue at Risk calculator helps you estimate how much of your YouTube earnings could be at risk due to TOS violations. Connect your YouTube channel to unlock this feature and get personalized insights.
            </p>
          </div>
        ) : (ytChannel && revenueError) ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 bg-risk/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-risk" />
            </div>
            <p className="text-risk font-medium mb-2">Failed to load revenue data</p>
            <p className="text-gray-600 mb-6">{revenueError}</p>
            <Button onClick={() => {
              onRefresh();
            }}>
              Retry
            </Button>
          </div>
        ) : revenueData?.setupRequired ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calculator className="h-8 w-8 text-yellow-600" />
            </div>
            <h3 className="text-subtitle font-semibold text-gray-800 mb-2">Setup Revenue Calculator</h3>
            <p className="text-gray-600 mb-6 max-w-md">
              Configure your CPM to get accurate revenue estimates and see exactly how much of your earnings are at risk from TOS violations.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 max-w-2xl">
              <div className="text-center">
                <div className="w-12 h-12 bg-safe/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <DollarSign className="h-6 w-6 text-safe" />
                </div>
                <h4 className="font-medium text-gray-800 text-sm">Accurate Revenue</h4>
                <p className="text-xs text-gray-600">Based on your actual CPM</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <TrendingUp className="h-6 w-6 text-yellow-600" />
                </div>
                <h4 className="font-medium text-gray-800 text-sm">Risk Assessment</h4>
                <p className="text-xs text-gray-600">See revenue at risk</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
                <h4 className="font-medium text-gray-800 text-sm">Protect Earnings</h4>
                <p className="text-xs text-gray-600">Fix issues early</p>
              </div>
            </div>
            <Button onClick={onSetupCPM}>
              Setup Revenue Calculator
            </Button>
          </div>
        ) : revenueData ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-risk/5 rounded-lg border border-risk/20">
                <div className="text-caption text-gray-600 mb-1">At Risk</div>
                <div className="text-title font-bold text-risk">${revenueData.atRisk.toLocaleString()}</div>
              </div>
              <div className="text-center p-3 bg-safe/5 rounded-lg border border-safe/20">
                <div className="text-caption text-gray-600 mb-1">Secured</div>
                <div className="text-title font-bold text-safe">${revenueData.secured.toLocaleString()}</div>
              </div>
              <div className="text-center p-3 bg-gray-100 rounded-lg border border-gray-200">
                <div className="text-caption text-gray-600 mb-1">Total</div>
                <div className="text-title font-bold text-gray-800">${revenueData.total.toLocaleString()}</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-safe transition-all duration-500"
                  style={{ width: `${revenueData.total > 0 ? (revenueData.secured / revenueData.total) * 100 : 0}%` }}
                />
              </div>
              <div className="text-right text-caption text-gray-500">
                {revenueData.total > 0 ? Math.round((revenueData.secured / revenueData.total) * 100) : 0}% Secured
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800">Top 5 Videos</h4>
              <div className="space-y-2">
                {revenueData.details.slice(0, 5).map((video) => (
                  <div key={video.videoId} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 truncate text-sm">{video.title}</div>
                      <div className="text-xs text-gray-500">
                        ${video.earnings.toLocaleString()} | {video.viewCount.toLocaleString()} views | {typeof video.rpm === 'number' && !isNaN(video.rpm) ? `RPM: $${video.rpm.toFixed(2)}` : `CPM: $${video.cpm?.toFixed(2) ?? '--'}`}
                      </div>
                    </div>
                    <span
                      className={`ml-3 px-2 py-1 rounded-full text-xs font-semibold ${
                        video.riskLevel === 'LOW' 
                          ? 'bg-safe text-white' 
                          : 'bg-risk text-white'
                      }`}
                    >
                      {video.riskLevel === 'LOW' ? 'Secured' : 'At Risk'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
} 