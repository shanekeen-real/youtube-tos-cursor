import axios from 'axios';
import { createWriteStream, unlink } from 'fs';
import { promisify } from 'util';
import { pipeline } from 'stream';
import { exec } from 'child_process';
import * as Sentry from '@sentry/nextjs';

const pipelineAsync = promisify(pipeline);
const execAsync = promisify(exec);

export interface VideoProcessingResult {
  videoPath: string;
  thumbnailPath?: string;
  duration: number;
  resolution: string;
  fileSize: number;
  success: boolean;
  error?: string;
}

export interface VideoAnalysisData {
  videoPath: string;
  transcript?: string;
  metadata?: any;
  videoInfo?: VideoProcessingResult;
}

/**
 * Download YouTube video using yt-dlp
 */
export async function downloadYouTubeVideo(videoId: string, outputDir: string = '/tmp'): Promise<VideoProcessingResult> {
  try {
    console.log(`Starting video download for: ${videoId}`);
    
    // Use yt-dlp to download video
    const outputPath = `${outputDir}/${videoId}.mp4`;
    const command = `yt-dlp -f "best[height<=720]" -o "${outputPath}" "https://www.youtube.com/watch?v=${videoId}"`;
    
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr && !stderr.includes('WARNING')) {
      console.error('yt-dlp stderr:', stderr);
    }
    
    console.log('yt-dlp stdout:', stdout);
    
    // Get video information using ffprobe
    const ffprobeCommand = `ffprobe -v quiet -print_format json -show_format -show_streams "${outputPath}"`;
    const { stdout: ffprobeOutput } = await execAsync(ffprobeCommand);
    const videoInfo = JSON.parse(ffprobeOutput);
    
    // Extract video details
    const format = videoInfo.format;
    const videoStream = videoInfo.streams.find((s: any) => s.codec_type === 'video');
    
    const result: VideoProcessingResult = {
      videoPath: outputPath,
      duration: parseFloat(format.duration) || 0,
      resolution: videoStream ? `${videoStream.width}x${videoStream.height}` : 'unknown',
      fileSize: parseInt(format.size) || 0,
      success: true
    };
    
    console.log(`Video downloaded successfully: ${result.videoPath}, Size: ${result.fileSize} bytes, Duration: ${result.duration}s`);
    return result;
    
  } catch (error: any) {
    console.error('Video download failed:', error);
    Sentry.captureException(error, {
      tags: { component: 'video-processing', action: 'download' },
      extra: { videoId, outputDir }
    });
    
    return {
      videoPath: '',
      duration: 0,
      resolution: 'unknown',
      fileSize: 0,
      success: false,
      error: error.message
    };
  }
}

/**
 * Extract key frames from video for analysis
 */
export async function extractKeyFrames(videoPath: string, outputDir: string = '/tmp', frameCount: number = 10): Promise<string[]> {
  try {
    console.log(`Extracting ${frameCount} key frames from: ${videoPath}`);
    
    const framePaths: string[] = [];
    const duration = await getVideoDuration(videoPath);
    
    // Extract frames at regular intervals
    for (let i = 0; i < frameCount; i++) {
      const timestamp = (duration / frameCount) * i;
      const framePath = `${outputDir}/frame_${i}.jpg`;
      
      const command = `ffmpeg -ss ${timestamp} -i "${videoPath}" -vframes 1 -q:v 2 "${framePath}" -y`;
      await execAsync(command);
      
      framePaths.push(framePath);
    }
    
    console.log(`Extracted ${framePaths.length} key frames`);
    return framePaths;
    
  } catch (error: any) {
    console.error('Key frame extraction failed:', error);
    Sentry.captureException(error, {
      tags: { component: 'video-processing', action: 'extract-frames' },
      extra: { videoPath, outputDir, frameCount }
    });
    return [];
  }
}

/**
 * Get video duration using ffprobe
 */
async function getVideoDuration(videoPath: string): Promise<number> {
  try {
    const command = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${videoPath}"`;
    const { stdout } = await execAsync(command);
    return parseFloat(stdout.trim()) || 0;
  } catch (error) {
    console.error('Failed to get video duration:', error);
    return 0;
  }
}

/**
 * Clean up temporary video files
 */
export async function cleanupVideoFiles(videoPath: string, framePaths: string[] = []): Promise<void> {
  try {
    // Remove video file
    if (videoPath) {
      await promisify(unlink)(videoPath);
      console.log(`Cleaned up video file: ${videoPath}`);
    }
    
    // Remove frame files
    for (const framePath of framePaths) {
      try {
        await promisify(unlink)(framePath);
        console.log(`Cleaned up frame file: ${framePath}`);
      } catch (error) {
        console.warn(`Failed to clean up frame file: ${framePath}`, error);
      }
    }
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}

/**
 * Check if video processing tools are available
 */
export async function checkVideoProcessingTools(): Promise<{ ytdlp: boolean; ffmpeg: boolean; ffprobe: boolean }> {
  try {
    console.log('Checking video processing tools...');
    console.log('Current PATH:', process.env.PATH);
    
    const results = await Promise.allSettled([
      execAsync('yt-dlp --version'),
      execAsync('ffmpeg -version'),
      execAsync('ffprobe -version')
    ]);
    
    console.log('Tool check results:', {
      ytdlp: { status: results[0].status, error: results[0].status === 'rejected' ? (results[0] as any).reason : null },
      ffmpeg: { status: results[1].status, error: results[1].status === 'rejected' ? (results[1] as any).reason : null },
      ffprobe: { status: results[2].status, error: results[2].status === 'rejected' ? (results[2] as any).reason : null }
    });
    
    return {
      ytdlp: results[0].status === 'fulfilled',
      ffmpeg: results[1].status === 'fulfilled',
      ffprobe: results[2].status === 'fulfilled'
    };
  } catch (error) {
    console.error('Failed to check video processing tools:', error);
    return { ytdlp: false, ffmpeg: false, ffprobe: false };
  }
}

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
    
  } catch (error: any) {
    console.error('Video preparation failed:', error);
    Sentry.captureException(error, {
      tags: { component: 'video-processing', action: 'prepare-analysis' },
      extra: { videoId }
    });
    return null;
  }
} 