"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Video, Lock, AlertTriangle } from 'lucide-react';
import { Button } from '@/lib/imports';
import * as Tooltip from '@radix-ui/react-tooltip';
import { UserProfile } from './types';

interface DashboardHeaderProps {
  userProfile: UserProfile | null;
  onUpgradeClick: () => void;
  ytChannel: any;
  ytFetching: boolean;
  channelContext: any;
  canBatchScan: boolean;
  handleYouTubeConnect: () => void;
}

export default function DashboardHeader({ 
  userProfile, 
  onUpgradeClick, 
  ytChannel, 
  ytFetching, 
  channelContext, 
  canBatchScan,
  handleYouTubeConnect 
}: DashboardHeaderProps) {
  const router = useRouter();
  const progress = userProfile ? (userProfile.scanCount / userProfile.scanLimit) * 100 : 0;

  return (
    <>
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-title font-semibold text-gray-800">My Dashboard</h1>
          <div className="flex items-center gap-3">
            {!ytChannel ? (
              <Button 
                size="sm" 
                disabled={ytFetching} 
                onClick={handleYouTubeConnect}
              >
                {ytFetching ? 'Connecting...' : 'Connect YouTube'}
              </Button>
            ) : (
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-2 text-safe font-medium text-sm">
                  <CheckCircle className="w-4 h-4" />
                  YouTube Connected
                </span>
                {channelContext && (
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      channelContext.aiIndicators?.aiProbability > 70 ? 'bg-red-500' : 
                      channelContext.aiIndicators?.aiProbability > 40 ? 'bg-yellow-500' : 'bg-green-500'
                    }`} />
                    <span className="text-xs text-gray-600">
                      AI Detection: {channelContext.aiIndicators?.aiProbability || 0}% confidence
                    </span>
                    <Tooltip.Provider>
                      <Tooltip.Root>
                        <Tooltip.Trigger asChild>
                          <button className="text-xs text-gray-400 hover:text-gray-600">
                            ℹ️
                          </button>
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                          <Tooltip.Content
                            className="bg-gray-900 text-white px-3 py-2 rounded-lg text-sm max-w-xs z-50"
                            sideOffset={5}
                          >
                            <div className="flex flex-col gap-1">
                              <span><strong>AI Detection Score:</strong> {channelContext.aiIndicators?.aiProbability || 0}%</span>
                              <span><strong>Confidence:</strong> {channelContext.aiIndicators?.confidence || 0}%</span>
                              <span><strong>Channel Age:</strong> {channelContext.channelData?.accountDate ? 
                                ((new Date().getTime() - new Date(channelContext.channelData.accountDate).getTime()) / (1000 * 60 * 60 * 24 * 365)).toFixed(1) : 'Unknown'} years</span>
                              <span><strong>Videos:</strong> {channelContext.channelData?.videoCount || 0}</span>
                              <span><strong>Subscribers:</strong> {channelContext.channelData?.subscriberCount?.toLocaleString() || 0}</span>
                              <span className="text-xs text-gray-300 mt-1">
                                Lower scores indicate more human-like content patterns
                              </span>
                            </div>
                            <Tooltip.Arrow className="fill-gray-900" />
                          </Tooltip.Content>
                        </Tooltip.Portal>
                      </Tooltip.Root>
                    </Tooltip.Provider>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3 mt-4">
          <Button 
            size="sm" 
            variant="outlined"
            onClick={() => router.push('/scan-history')}
          >
            Scan Results
          </Button>
          <Tooltip.Provider>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <div>
                  <Button
                    size="sm"
                    variant="outlined"
                    className={`flex items-center gap-2 ${!canBatchScan ? 'opacity-50 cursor-not-allowed bg-gray-100 hover:bg-gray-100 text-gray-600' : ''}`}
                    onClick={canBatchScan ? () => {/* TODO: Implement batch scan handler */} : undefined}
                    disabled={!canBatchScan}
                  >
                    {!canBatchScan ? <Lock className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                    Scan All Videos
                  </Button>
                </div>
              </Tooltip.Trigger>
              {!canBatchScan && (
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="bg-gray-900 text-white px-3 py-2 rounded-lg text-sm max-w-xs z-50"
                    sideOffset={5}
                  >
                    <div className="flex flex-col gap-1">
                      <span>Batch analysis is only available for Advanced Members.</span>
                      <span>Please visit <Link href="/pricing" className="text-yellow-400 hover:text-yellow-300 underline">Pricing</Link> page to upgrade your plan.</span>
                    </div>
                    <Tooltip.Arrow className="fill-gray-900" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              )}
            </Tooltip.Root>
          </Tooltip.Provider>
        </div>
      </div>
    </>
  );
} 