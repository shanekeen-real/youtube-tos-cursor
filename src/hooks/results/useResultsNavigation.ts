"use client";

import { useState } from 'react';
import { BarChart3, FileText, Target, Brain } from 'lucide-react';
import { TabType, TabConfig } from '@/components/results/types';

export function useResultsNavigation() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const tabs: TabConfig[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'details', label: 'Details', icon: FileText },
    { id: 'ai-detection', label: 'AI Content Detection', icon: Brain, requiresAccess: true },
    { id: 'suggestions', label: 'Suggestions', icon: Target }
  ];

  return {
    activeTab,
    setActiveTab,
    tabs
  };
} 