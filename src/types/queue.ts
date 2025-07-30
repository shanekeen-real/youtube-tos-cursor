import { Timestamp } from 'firebase-admin/firestore';

export interface ScanQueueItem {
  id: string;
  userId: string;
  videoId: string;
  videoTitle: string;
  videoThumbnail: string;
  originalUrl: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  currentStep: string;
  totalSteps: number;
  currentStepIndex: number;
  error?: string;
  createdAt: Timestamp;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  scanId?: string; // Reference to analysis_cache document
  priority: 'low' | 'normal' | 'high';
  isOwnVideo: boolean;
  archivedFromQueue?: boolean; // New field to track if completed scan was removed from "In Queue" tab
  scanOptions?: {
    includeTranscript: boolean;
    includeAI: boolean;
    includeMultiModal: boolean;
  };
}

export interface BatchJob {
  id: string;
  userId: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  totalVideos: number;
  completedVideos: number;
  failedVideos: number;
  scanQueueIds: string[]; // References to ScanQueueItem documents
  createdAt: Timestamp;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  error?: string;
  scanOptions: {
    includeTranscript: boolean;
    includeAI: boolean;
    includeMultiModal: boolean;
    priority: 'low' | 'normal' | 'high';
  };
}

export interface QueueStats {
  totalPending: number;
  totalProcessing: number;
  totalCompleted: number;
  totalFailed: number;
  averageProcessingTime: number; // in seconds
  queueSize: number;
}

export interface UserQueueLimits {
  maxConcurrentScans: number;
  maxQueueSize: number;
  maxBatchSize: number;
  priorityProcessing: boolean;
} 