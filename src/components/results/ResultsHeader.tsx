import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Lock, BarChart3 } from 'lucide-react';
import Button from '@/components/Button';
import * as Tooltip from '@radix-ui/react-tooltip';

interface ResultsHeaderProps {
  canExport: boolean;
  onExportClick: () => void;
}

export default function ResultsHeader({ canExport, onExportClick }: ResultsHeaderProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link href="/">
          <Button variant="outlined" className="inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            New Scan
          </Button>
        </Link>
        
        <Tooltip.Provider>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <div>
                <Button 
                  onClick={canExport ? onExportClick : undefined}
                  className={`inline-flex items-center gap-2 ${!canExport ? 'opacity-50 cursor-not-allowed bg-gray-300 hover:bg-gray-300 text-gray-600' : ''}`}
                  disabled={!canExport}
                >
                  {!canExport ? <Lock className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                  Export Report
                </Button>
              </div>
            </Tooltip.Trigger>
            {!canExport && (
              <Tooltip.Portal>
                <Tooltip.Content
                  className="bg-gray-900 text-white px-3 py-2 rounded-lg text-sm max-w-xs z-50"
                  sideOffset={5}
                >
                  <div className="flex flex-col gap-1">
                    <span>Feature is only available for Pro Members.</span>
                    <span>Please visit <Link href="/pricing" className="text-yellow-300 hover:text-yellow-200 underline">Pricing</Link> page to upgrade your plan.</span>
                  </div>
                  <Tooltip.Arrow className="fill-gray-900" />
                </Tooltip.Content>
              </Tooltip.Portal>
            )}
          </Tooltip.Root>
        </Tooltip.Provider>
        
        <Link href="/scan-history">
          <Button className="inline-flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            View History
          </Button>
        </Link>
      </div>
    </div>
  );
} 