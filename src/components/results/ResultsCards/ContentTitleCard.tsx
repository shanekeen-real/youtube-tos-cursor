import React from 'react';
import { FileText } from 'lucide-react';
import { Card } from '@/lib/imports';

interface ContentTitleCardProps {
  title?: string;
}

export default function ContentTitleCard({ title }: ContentTitleCardProps) {
  return (
    <Card>
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
          <FileText className="w-6 h-6 text-gray-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-caption text-gray-600 mb-1">Content Title</h3>
          <p className="text-body font-semibold text-gray-800 truncate">{title}</p>
        </div>
      </div>
    </Card>
  );
} 