import React, { useState } from 'react';
import { X, DollarSign, TrendingUp, Shield, Calculator, Info, Zap, Settings } from 'lucide-react';
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
            className="z-50 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg max-w-xs"
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
              <Calculator className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Setup Revenue Calculator</h2>
              <p className="text-sm text-gray-600 mt-1">Enter your CPM or RPM for accurate revenue estimates</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          {/* CPM/RPM Section */}
          <Card className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Enter CPM or RPM <span className='text-red-500'>*</span></h3>
            </div>
            
            <div className="flex items-center gap-6 mb-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="radio" 
                  checked={!useRpm} 
                  onChange={() => setUseRpm(false)}
                  className="w-4 h-4 text-yellow-600 border-gray-300 focus:ring-yellow-500"
                />
                <span className="font-medium text-gray-900">CPM</span>
                <InfoTooltip content="CPM is what advertisers pay per 1,000 monetized views, before YouTube's cut.">
                  <Info className="w-4 h-4 text-yellow-500" />
                </InfoTooltip>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="radio" 
                  checked={useRpm} 
                  onChange={() => setUseRpm(true)}
                  className="w-4 h-4 text-yellow-600 border-gray-300 focus:ring-yellow-500"
                />
                <span className="font-medium text-gray-900">RPM</span>
                <InfoTooltip content="RPM is your actual earnings per 1,000 total views, after YouTube's cut and all adjustments. If you know your RPM, use this for the most accurate results.">
                  <Info className="w-4 h-4 text-green-500" />
                </InfoTooltip>
              </label>
            </div>
            
            {!useRpm ? (
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-3">CPM ($)
                  <InfoTooltip content="Typical CPMs for YouTube creators range from $1 to $15 depending on niche and audience.">
                    <Info className="w-4 h-4 text-yellow-500" />
                  </InfoTooltip>
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={minValue}
                    max={maxValue}
                    step={stepValue}
                    value={cpm ?? minValue}
                    onChange={e => setCpm(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <span className="font-bold text-yellow-600 min-w-[60px] text-lg">${cpm?.toFixed(2) ?? '--'}</span>
                </div>
                <div className="text-xs text-gray-500 mt-2">Typical range: $1 - $15</div>
              </div>
            ) : (
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-3">RPM ($)
                  <InfoTooltip content="RPM is your actual earnings per 1,000 total views. Typical RPMs for YouTube creators range from $0.50 to $8.">
                    <Info className="w-4 h-4 text-green-500" />
                  </InfoTooltip>
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={minValue}
                    max={maxValue}
                    step={stepValue}
                    value={rpm ?? minValue}
                    onChange={e => setRpm(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <span className="font-bold text-green-600 min-w-[60px] text-lg">${rpm?.toFixed(2) ?? '--'}</span>
                </div>
                <div className="text-xs text-gray-500 mt-2">Typical range: $0.50 - $8 (after YouTube's cut)</div>
              </div>
            )}
          </Card>
          
          {/* Optional Advanced Settings */}
          <Card className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <Settings className="w-4 h-4 text-gray-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Advanced Settings (Optional but Recommended)</h3>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-3">Estimated % of Views Monetized
                  <InfoTooltip content="Not all views show ads. Enter the percentage of your views that are monetized (typical range: 40–80%).">
                    <Info className="w-4 h-4 text-yellow-500" />
                  </InfoTooltip>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={10}
                    max={100}
                    step={1}
                    value={monetizedPercent}
                    onChange={e => setMonetizedPercent(Math.max(10, Math.min(100, parseInt(e.target.value) || 10)))}
                    className="w-24 border border-gray-200 rounded-lg p-2 text-center focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                  <span className="font-medium text-gray-900">%</span>
                </div>
                <div className="text-xs text-gray-500 mt-2">Typical for YouTube: 40–80%</div>
              </div>
              
              {!useRpm && (
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    checked={includeCut} 
                    onChange={e => setIncludeCut(e.target.checked)}
                    className="w-4 h-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                  />
                  <div>
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">Include YouTube's 45% Cut?
                      <InfoTooltip content="YouTube takes 45% of ad revenue. If your CPM is before YouTube's cut, leave this checked. If your CPM is after YouTube's cut, uncheck.">
                        <Info className="w-4 h-4 text-yellow-500" />
                      </InfoTooltip>
                    </label>
                    <div className="text-xs text-gray-500 mt-1">Uncheck if your CPM is already after YouTube's cut</div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center gap-2 text-red-800">
                <Shield className="w-4 h-4" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <Button onClick={onClose} variant="outlined" disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSetup} disabled={loading} className="flex items-center gap-2">
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Setting up...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Setup Calculator
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
} 