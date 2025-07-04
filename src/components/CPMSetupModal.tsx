import React, { useState } from 'react';
import { X, DollarSign, TrendingUp, Shield, Calculator, Info } from 'lucide-react';
import Button from './Button';
import Card from './Card';
import * as Tooltip from '@radix-ui/react-tooltip';

interface CPMSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSetupComplete: () => void;
}

function InfoTooltip({ content, children }: { content: string, children: React.ReactNode }) {
  return (
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span tabIndex={0} className="inline-flex items-center cursor-pointer focus:outline-none">
            {children}
          </span>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="z-50 bg-gray-900 text-white text-xs rounded px-2 py-1 shadow-lg"
            side="top"
            sideOffset={6}
          >
            {content}
            <Tooltip.Arrow className="fill-gray-900" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

export default function CPMSetupModal({ isOpen, onClose, onSetupComplete }: CPMSetupModalProps) {
  const [cpm, setCpm] = useState<number | null>(3.0);
  const [rpm, setRpm] = useState<number | null>(null);
  const [useRpm, setUseRpm] = useState(false);
  const [monetizedPercent, setMonetizedPercent] = useState(60);
  const [includeCut, setIncludeCut] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // CPM/RPM slider config
  const minValue = 0.1;
  const maxValue = 20;
  const stepValue = 0.1;

  const handleSetup = async () => {
    setLoading(true);
    setError(null);
    try {
      if ((!useRpm && (cpm === null || isNaN(cpm))) || (useRpm && (rpm === null || isNaN(rpm)))) {
        setError('Please enter a valid CPM or RPM value.');
        setLoading(false);
        return;
      }
      const response = await fetch('/api/setup-revenue-calculator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cpm: useRpm ? null : cpm,
          rpm: useRpm ? rpm : null,
          monetizedPercent,
          includeCut,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to setup revenue calculator');
      }
      onSetupComplete();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to setup revenue calculator');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calculator className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Setup Revenue Calculator</h2>
              <p className="text-sm text-gray-600 mt-1">Enter your CPM or RPM for accurate revenue estimates</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>
        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          {/* CPM/RPM Section */}
          <Card className="mb-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Enter CPM or RPM <span className='text-red-500'>*</span></h3>
            <div className="flex items-center gap-4 mb-4">
              <label className="flex items-center gap-2">
                <input type="radio" checked={!useRpm} onChange={() => setUseRpm(false)} />
                <span>CPM</span>
                <InfoTooltip content="CPM is what advertisers pay per 1,000 monetized views, before YouTube's cut.">
                  <Info className="w-4 h-4 text-blue-500" />
                </InfoTooltip>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={useRpm} onChange={() => setUseRpm(true)} />
                <span>RPM</span>
                <InfoTooltip content="RPM is your actual earnings per 1,000 total views, after YouTube's cut and all adjustments. If you know your RPM, use this for the most accurate results.">
                  <Info className="w-4 h-4 text-green-500" />
                </InfoTooltip>
              </label>
            </div>
            {!useRpm ? (
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">CPM ($)
                  <InfoTooltip content="Typical CPMs for YouTube creators range from $1 to $15 depending on niche and audience.">
                    <Info className="w-4 h-4 text-blue-500" />
                  </InfoTooltip>
                </label>
                <div className="flex items-center gap-4 mt-2">
                  <input
                    type="range"
                    min={minValue}
                    max={maxValue}
                    step={stepValue}
                    value={cpm ?? minValue}
                    onChange={e => setCpm(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <span className="font-bold text-blue-700 min-w-[60px] text-lg">${cpm?.toFixed(2) ?? '--'}</span>
                </div>
              </div>
            ) : (
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">RPM ($)
                  <InfoTooltip content="RPM is your actual earnings per 1,000 total views. Typical RPMs for YouTube creators range from $0.50 to $8.">
                    <Info className="w-4 h-4 text-green-500" />
                  </InfoTooltip>
                </label>
                <div className="flex items-center gap-4 mt-2">
                  <input
                    type="range"
                    min={minValue}
                    max={maxValue}
                    step={stepValue}
                    value={rpm ?? minValue}
                    onChange={e => setRpm(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <span className="font-bold text-green-700 min-w-[60px] text-lg">${rpm?.toFixed(2) ?? '--'}</span>
                </div>
                <div className="text-xs text-gray-600 mt-2">RPM is your actual earnings after YouTube's cut and all adjustments.</div>
              </div>
            )}
          </Card>
          {/* Optional Advanced Settings */}
          <Card className="mb-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Advanced Settings (Optional but Recommended)</h3>
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">Estimated % of Views Monetized
                <InfoTooltip content="Not all views show ads. Enter the percentage of your views that are monetized (typical range: 40–80%).">
                  <Info className="w-4 h-4 text-blue-500" />
                </InfoTooltip>
              </label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="number"
                  min={10}
                  max={100}
                  step={1}
                  value={monetizedPercent}
                  onChange={e => setMonetizedPercent(Math.max(10, Math.min(100, parseInt(e.target.value) || 10)))}
                  className="w-24 border rounded p-2"
                />
                <span className="font-medium">%</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">Typical for YouTube: 40–80%</div>
            </div>
            {!useRpm && (
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">Include YouTube's 45% Cut?
                  <InfoTooltip content="YouTube takes 45% of ad revenue. If your CPM is before YouTube's cut, leave this checked. If your CPM is after YouTube's cut, uncheck.">
                    <Info className="w-4 h-4 text-blue-500" />
                  </InfoTooltip>
                </label>
                <input type="checkbox" checked={includeCut} onChange={e => setIncludeCut(e.target.checked)} />
              </div>
            )}
          </Card>
          {/* Example Calculation */}
          <Card className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-900">Example Calculation</h3>
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-gray-700 mb-2">
                {useRpm
                  ? <>With your RPM of <span className="font-bold">${rpm?.toFixed(2) ?? '--'}</span>:</>
                  : <>With your CPM of <span className="font-bold">${cpm?.toFixed(2) ?? '--'}</span>:</>
                }
              </p>
              <div className="space-y-1 text-sm">
                {useRpm ? (
                  <>
                    <div>• 1,000 views = <span className="font-bold">${rpm ? rpm.toFixed(2) : '--'}</span></div>
                    <div>• 10,000 views = <span className="font-bold">${rpm ? (rpm * 10).toFixed(2) : '--'}</span></div>
                    <div>• 100,000 views = <span className="font-bold">${rpm ? (rpm * 100).toFixed(2) : '--'}</span></div>
                  </>
                ) : (
                  <>
                    <div>• 1,000 views = <span className="font-bold">${cpm ? ((monetizedPercent / 100) * (includeCut ? 0.55 : 1) * cpm).toFixed(2) : '--'}</span></div>
                    <div>• 10,000 views = <span className="font-bold">${cpm ? ((monetizedPercent / 100) * (includeCut ? 0.55 : 1) * cpm * 10).toFixed(2) : '--'}</span></div>
                    <div>• 100,000 views = <span className="font-bold">${cpm ? ((monetizedPercent / 100) * (includeCut ? 0.55 : 1) * cpm * 100).toFixed(2) : '--'}</span></div>
                  </>
                )}
              </div>
            </div>
          </Card>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>
        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 sticky bottom-0 z-10">
          <Button variant="outlined" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSetup} disabled={loading} className="min-w-[120px]">
            {loading ? 'Setting up...' : 'Complete Setup'}
          </Button>
        </div>
      </div>
    </div>
  );
} 