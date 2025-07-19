import React from 'react';
import { Shield } from 'lucide-react';
import { Card } from '@/lib/imports';
import { Button } from '@/lib/imports';

export default function QuickActionsCard() {
  return (
    <Card>
      <div className="flex items-center gap-3 mb-4">
        <Shield className="w-5 h-5 text-yellow-500" />
        <h2 className="text-subtitle font-semibold text-gray-800">Quick Actions</h2>
      </div>
      <div className="space-y-3">
        <Button 
          variant="outlined" 
          onClick={() => window.location.href = '/dashboard'}
          className="w-full justify-start"
        >
          Go to Dashboard
        </Button>
        <Button 
          variant="outlined" 
          onClick={() => window.location.href = '/scan-history'}
          className="w-full justify-start"
        >
          View Scan History
        </Button>
        <Button 
          variant="outlined" 
          onClick={() => window.location.href = '/pricing'}
          className="w-full justify-start"
        >
          Manage Subscription
        </Button>
      </div>
    </Card>
  );
} 