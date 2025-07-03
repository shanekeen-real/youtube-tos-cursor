import React, { useState } from 'react';
import { X, DollarSign, TrendingUp, Shield, Calculator } from 'lucide-react';
import Button from './Button';
import Card from './Card';

interface CPMSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSetupComplete: () => void;
}

export default function CPMSetupModal({ isOpen, onClose, onSetupComplete }: CPMSetupModalProps) {
  const [cpm, setCpm] = useState(3.0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSetup = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/setup-revenue-calculator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cpm }),
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
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calculator className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Setup Revenue Calculator</h2>
              <p className="text-sm text-gray-600 mt-1">Configure your CPM to get accurate revenue estimates</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          {/* Benefits Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-900">Why Setup Revenue Calculator?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900">Accurate Revenue</h4>
                  <p className="text-sm text-gray-600">Get precise revenue estimates based on your actual CPM</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900">Risk Assessment</h4>
                  <p className="text-sm text-gray-600">See exactly how much revenue is at risk from TOS violations</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900">Protect Earnings</h4>
                  <p className="text-sm text-gray-600">Identify and fix issues before they impact your income</p>
                </div>
              </div>
            </div>
          </div>

          {/* CPM Setup Section */}
          <Card className="mb-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Set Your CPM (Cost Per Mille)</h3>
            <p className="text-sm text-gray-600 mb-4">
              CPM is how much advertisers pay per 1,000 views. This varies by niche, audience, and content type.
            </p>
            
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Your CPM Rate</label>
                <span className="text-lg font-bold text-blue-600">${cpm.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="20"
                step="0.1"
                value={cpm}
                onChange={(e) => setCpm(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>$0.10</span>
                <span>$20.00</span>
              </div>
            </div>

            {/* CPM Guidelines */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">CPM Guidelines by Niche:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Gaming:</span> $1-3
                </div>
                <div>
                  <span className="font-medium text-gray-700">Education:</span> $3-8
                </div>
                <div>
                  <span className="font-medium text-gray-700">Finance:</span> $8-15
                </div>
                <div>
                  <span className="font-medium text-gray-700">Technology:</span> $5-12
                </div>
                <div>
                  <span className="font-medium text-gray-700">Entertainment:</span> $2-6
                </div>
                <div>
                  <span className="font-medium text-gray-700">Lifestyle:</span> $3-8
                </div>
              </div>
            </div>
          </Card>

          {/* Example Calculation */}
          <Card className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-900">Example Calculation</h3>
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-gray-700 mb-2">
                With your CPM of <span className="font-bold">${cpm.toFixed(2)}</span>:
              </p>
              <div className="space-y-1 text-sm">
                <div>• 1,000 views = <span className="font-bold">${cpm.toFixed(2)}</span></div>
                <div>• 10,000 views = <span className="font-bold">${(cpm * 10).toFixed(2)}</span></div>
                <div>• 100,000 views = <span className="font-bold">${(cpm * 100).toFixed(2)}</span></div>
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
          <Button 
            onClick={handleSetup} 
            disabled={loading}
            className="min-w-[120px]"
          >
            {loading ? 'Setting up...' : 'Complete Setup'}
          </Button>
        </div>
      </div>
    </div>
  );
} 