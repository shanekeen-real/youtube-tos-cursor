import { useState } from 'react';
import { ScanData } from '@/components/results/types';

export function useResultsExport() {
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const openExportModal = () => setExportModalOpen(true);
  const closeExportModal = () => setExportModalOpen(false);

  return {
    exportModalOpen,
    openExportModal,
    closeExportModal
  };
} 