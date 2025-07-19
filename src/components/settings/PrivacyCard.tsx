import React from 'react';
import { Shield } from 'lucide-react';
import Card from '../Card';

interface PrivacyCardProps {
  exportStatus: string | null;
  deleteStatus: string | null;
  deleting: boolean;
  onExport: () => void;
  onDelete: () => void;
}

export default function PrivacyCard({ 
  exportStatus, 
  deleteStatus, 
  deleting, 
  onExport, 
  onDelete 
}: PrivacyCardProps) {
  return (
    <Card>
      <div className="flex items-center gap-3 mb-4">
        <Shield className="w-5 h-5 text-yellow-500" />
        <h2 className="text-subtitle font-semibold text-gray-800">Privacy & Data Controls</h2>
      </div>
      <button 
        onClick={onExport} 
        className="w-full mb-3 px-4 py-2 rounded-lg bg-yellow-500 text-black font-semibold hover:bg-yellow-400 transition"
      >
        Export My Data
      </button>
      {exportStatus && (
        <div 
          className="mb-3 text-sm" 
          style={{ color: exportStatus.startsWith("Export successful") ? "#00C853" : "#FF3B30" }}
        >
          {exportStatus}
        </div>
      )}
      <button 
        onClick={onDelete} 
        disabled={deleting} 
        className={`w-full px-4 py-2 rounded-lg ${
          deleting ? "bg-gray-200 text-gray-500" : "bg-risk text-white hover:bg-red-600"
        } font-semibold transition`}
      >
        {deleting ? "Deleting..." : "Delete My Account"}
      </button>
      {deleteStatus && (
        <div 
          className="mt-3 text-sm" 
          style={{ color: deleteStatus.startsWith("Account deleted") ? "#00C853" : "#FF3B30" }}
        >
          {deleteStatus}
        </div>
      )}
      <div className="mt-4 text-xs text-gray-500">
        Download a copy of your data or permanently delete your account. Deletion is irreversible.
      </div>
    </Card>
  );
} 