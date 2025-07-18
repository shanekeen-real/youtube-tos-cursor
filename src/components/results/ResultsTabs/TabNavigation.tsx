import React from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { TabType, TabConfig } from '../types';
import { toArray } from '../ResultsUtils';
import { ScanData } from '../types';

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  data: ScanData;
  canAccessAIDetection: boolean;
  tabs: TabConfig[];
}

export default function TabNavigation({ 
  activeTab, 
  onTabChange, 
  data, 
  canAccessAIDetection, 
  tabs 
}: TabNavigationProps) {
  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="flex space-x-8">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          const requiresAccess = tab.requiresAccess && !canAccessAIDetection;
          
          return (
            <div key={tab.id} className="relative">
              {requiresAccess ? (
                <Tooltip.Provider>
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <button
                        className="py-3 px-1 border-b-2 font-medium text-body transition-colors flex items-center gap-2 opacity-50 cursor-not-allowed border-transparent text-gray-500"
                        disabled
                      >
                        <Lock className="w-4 h-4" />
                        {tab.label}
                      </button>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content
                        className="bg-gray-900 text-white px-3 py-2 rounded-lg text-sm max-w-xs z-50"
                        sideOffset={5}
                      >
                        <div className="flex flex-col gap-1">
                          <span>Feature is only available for Advanced Members.</span>
                          <span>Please visit <Link href="/pricing" className="text-yellow-300 hover:text-yellow-200 underline">Pricing</Link> page to upgrade your plan.</span>
                        </div>
                        <Tooltip.Arrow className="fill-gray-900" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                </Tooltip.Provider>
              ) : (
                <button
                  onClick={() => onTabChange(tab.id)}
                  className={`py-3 px-1 border-b-2 font-medium text-body transition-colors flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-yellow-500 text-yellow-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  {tab.label}
                  {tab.id === 'suggestions' && toArray(data.suggestions).length > 0 && (
                    <span className="ml-1 flex items-center justify-center rounded-full bg-yellow-500 text-gray-900 text-xs font-bold w-5 h-5">
                      {toArray(data.suggestions).length}
                    </span>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
} 