import * as Sentry from '@sentry/nextjs';
import { VideoAnalysisData } from '../../../types/video-processing';
import { downloadYouTubeVideo } from '../download/youtube-downloader';
import { extractKeyFrames } from '../processing/frame-extractor';
import { checkVideoProcessingTools } from './tool-checker';

/**
 * Prepare video for multi-modal analysis
 */
export async function prepareVideoForAnalysis(videoId: string): Promise<VideoAnalysisData | null> {
  try {
    console.log(`Preparing video ${videoId} for multi-modal analysis`);
    
    // Check if video processing tools are available
    const tools = await checkVideoProcessingTools();
    if (!tools.ytdlp || !tools.ffmpeg || !tools.ffprobe) {
      console.warn('Video processing tools not available:', tools);
      return null;
    }
    
    // Download video
    const videoResult = await downloadYouTubeVideo(videoId);
    if (!videoResult.success) {
      console.error('Video download failed:', videoResult.error);
      return null;
    }
    
    // Extract key frames
    const framePaths = await extractKeyFrames(videoResult.videoPath);
    
    // Create video analysis data
    const analysisData: VideoAnalysisData = {
      videoPath: videoResult.videoPath,
      videoInfo: videoResult
    };
    
    // Clean up files after analysis (will be done by caller)
    return analysisData;
    
  } catch (error: unknown) {
    const preparationError = error as Error;
    console.error('Video preparation failed:', preparationError);
    Sentry.captureException(preparationError, {
      tags: { component: 'video-processing', action: 'prepare-analysis' },
      extra: { videoId }
    });
    return null;
  }
} 