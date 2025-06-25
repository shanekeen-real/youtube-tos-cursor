'use client';

import { useState } from 'react';
import * as Sentry from '@sentry/nextjs';

interface SentryTestWidgetProps {
  position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
  showByDefault?: boolean;
}

export default function SentryTestWidget({ 
  position = 'bottom-right', 
  showByDefault = false 
}: SentryTestWidgetProps) {
  const [isOpen, setIsOpen] = useState(showByDefault);
  const [lastTest, setLastTest] = useState<string>('');

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'bottom-right': 'bottom-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-left': 'bottom-4 left-4',
  };

  const runQuickTest = (testType: string) => {
    setLastTest(`${new Date().toLocaleTimeString()}: ${testType}`);
    
    switch (testType) {
      case 'error':
        try {
          throw new Error('Quick test error for Sentry');
        } catch (error) {
          Sentry.captureException(error);
        }
        break;
      
      case 'message':
        Sentry.captureMessage('Quick test message for Sentry', 'info');
        break;
      
      case 'network':
        fetch('https://invalid-url-test-12345.com').catch(error => {
          Sentry.captureException(error);
        });
        break;
      
      case 'json':
        try {
          JSON.parse('invalid json');
        } catch (error) {
          Sentry.captureException(error);
        }
        break;
      
      case 'type':
        try {
          const obj = null;
          // @ts-ignore
          obj.someMethod();
        } catch (error) {
          Sentry.captureException(error);
        }
        break;
    }
  };

  if (!isOpen) {
    return (
      <div className={`fixed ${positionClasses[position]} z-50`}>
        <button
          onClick={() => setIsOpen(true)}
          className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-full shadow-lg transition-colors"
          title="Test Sentry Errors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      <div className="bg-white border border-gray-200 rounded-lg shadow-xl p-4 w-64">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Sentry Test</h3>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-2 mb-3">
          <button
            onClick={() => runQuickTest('error')}
            className="w-full bg-red-500 text-white text-xs px-3 py-1 rounded hover:bg-red-600 transition-colors"
          >
            Test Error
          </button>
          
          <button
            onClick={() => runQuickTest('message')}
            className="w-full bg-blue-500 text-white text-xs px-3 py-1 rounded hover:bg-blue-600 transition-colors"
          >
            Test Message
          </button>
          
          <button
            onClick={() => runQuickTest('network')}
            className="w-full bg-orange-500 text-white text-xs px-3 py-1 rounded hover:bg-orange-600 transition-colors"
          >
            Test Network
          </button>
          
          <button
            onClick={() => runQuickTest('json')}
            className="w-full bg-purple-500 text-white text-xs px-3 py-1 rounded hover:bg-purple-600 transition-colors"
          >
            Test JSON Parse
          </button>
          
          <button
            onClick={() => runQuickTest('type')}
            className="w-full bg-green-500 text-white text-xs px-3 py-1 rounded hover:bg-green-600 transition-colors"
          >
            Test TypeError
          </button>
        </div>
        
        {lastTest && (
          <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
            Last test: {lastTest}
          </div>
        )}
        
        <div className="text-xs text-gray-500 mt-2">
          Check Sentry dashboard for results
        </div>
      </div>
    </div>
  );
} 