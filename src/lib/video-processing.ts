import axios from 'axios';
import { createWriteStream, unlink } from 'fs';
import { promisify } from 'util';
import { pipeline } from 'stream';
import { exec } from 'child_process';
import * as Sentry from '@sentry/nextjs';
import fs from 'fs';
import path from 'path';

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
    console.log(`Output directory: ${outputDir}`);
    
    // Use yt-dlp to download video with better format selection
    const outputPath = `${outputDir}/${videoId}.mp4`;
    
    // More robust format selection - prefer formats that are known to work well
    const command = `yt-dlp -f "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best" -o "${outputPath}" "https://www.youtube.com/watch?v=${videoId}"`;
    
    console.log(`Executing command: ${command}`);
    
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr && !stderr.includes('WARNING')) {
      console.error('yt-dlp stderr:', stderr);
    }
    
    console.log('yt-dlp stdout:', stdout);
    
    // Verify the file was downloaded and has reasonable size
    if (!fs.existsSync(outputPath)) {
      throw new Error(`Video file not found at ${outputPath}`);
    }
    
    const stats = fs.statSync(outputPath);
    console.log(`Downloaded file size: ${stats.size} bytes (${(stats.size / 1024).toFixed(2)} KB)`);
    
    // Check if file size is suspiciously small (less than10B for a video)
    if (stats.size < 104) {
      console.warn(`Warning: Video file is suspiciously small (${stats.size} bytes). This might indicate a download issue.`);
      
      // Try to read the first few bytes to see if it's an error page
      const fileContent = fs.readFileSync(outputPath, 'utf8').substring(0, 500);
      if (fileContent.includes('<!DOCTYPE html>') || fileContent.includes('<html>')) {
        throw new Error('Downloaded file appears to be an HTML error page, not a video file');
      }
    }
    
    // Verify video file integrity with ffprobe
    const probeCommand = `ffprobe -v quiet -print_format json -show_format -show_streams ${outputPath}"`;
    console.log(`Running ffprobe: ${probeCommand}`);
    
    const { stdout: probeStdout, stderr: probeStderr } = await execAsync(probeCommand);
    
    if (probeStderr) {
      console.error('ffprobe stderr:', probeStderr);
    }
    
    const probeData = JSON.parse(probeStdout);
    console.log('Video file analysis:', {
      duration: probeData.format?.duration,
      size: probeData.format?.size,
      bitrate: probeData.format?.bit_rate,
      videoStreams: probeData.streams?.filter((s: any) => s.codec_type === 'video').length,
      audioStreams: probeData.streams?.filter((s: any) => s.codec_type === 'audio').length
    });
    
    // Check if video stream has proper pixel format
    const videoStream = probeData.streams?.find((s: any) => s.codec_type === 'video');
    if (videoStream && (!videoStream.pix_fmt || videoStream.pix_fmt === 'none')) {
      console.warn('Warning: Video stream has no pixel format specified. This may cause frame extraction issues.');
    }
    
    return {
      videoPath: outputPath,
      duration: parseFloat(probeData.format?.duration || '0'),
      resolution: videoStream ? `${videoStream.width}x${videoStream.height}` : 'unknown',
      fileSize: parseInt(probeData.format?.size || '0'),
      success: true
    };
    
  } catch (error: any) {
    console.error('Video download failed:', error);
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
export async function extractKeyFrames(videoPath: string, outputDir: string = '/tmp', frameCount?: number): Promise<string[]> {
  try {
    const duration = await getVideoDuration(videoPath);
    console.log(`Video duration: ${duration}s`);
    
    // Dynamic screenshot scaling based on video duration
    let actualFrameCount: number;
    if (frameCount !== undefined) {
      // Use provided frameCount if specified (for backward compatibility)
      actualFrameCount = frameCount;
    } else { // Dynamic scaling based on video duration
      if (duration < 60) { // < 1 minute
        actualFrameCount = 3
      } else if (duration < 120) { // <2tes
        actualFrameCount = 5
      } else if (duration < 180) { // <3tes
        actualFrameCount = 10
      } else { // >=3tes
        actualFrameCount = 10
      }
    }
    
    console.log(`Extracting ${actualFrameCount} key frames from: ${videoPath} (duration: ${duration.toFixed(1)}s)`);
    
    // Check if video file exists and is readable
    if (!fs.existsSync(videoPath)) {
      console.error(`❌ ERROR: Video file does not exist: ${videoPath}`);
      return [];
    }
    
    const videoStats = fs.statSync(videoPath);
    
    // Check if file is readable
    let isReadable = 'No';
    try {
      fs.accessSync(videoPath, fs.constants.R_OK);
      isReadable = 'Yes';
    } catch (error) {
      isReadable = 'No';
    }
    
    console.log(`Video file stats:`, {
      path: videoPath,
      size: videoStats.size,
      sizeInKB: (videoStats.size / 1024).toFixed(2),
      isFile: videoStats.isFile(),
      readable: isReadable
    });
    
    if (videoStats.size < 100000) {
      console.warn(`⚠️  WARNING: Video file is very small (${videoStats.size} bytes). This might cause FFmpeg issues.`);
    }
    
    const framePaths: string[] = [];
    
    // Extract frames at regular intervals
    for (let i = 0; i < actualFrameCount; i++) {
      const timestamp = (duration / actualFrameCount) * i;
      const framePath = `${outputDir}/frame_${i}.jpg`;
      
      console.log(`Extracting frame ${i + 1}/${actualFrameCount} at timestamp ${timestamp.toFixed(2)}s -> ${framePath}`);
      
      const command = `ffmpeg -ss ${timestamp} -i "${videoPath}" -vframes 1 -q:v 2 -pix_fmt yuv420p "${framePath}" -y`;
      console.log(`FFmpeg command: ${command}`);
      
      try {
        const { stdout, stderr } = await execAsync(command);
        if (stdout) console.log(`FFmpeg stdout: ${stdout}`);
        if (stderr) console.log(`FFmpeg stderr: ${stderr}`);
        
        // Check if frame was actually created
        if (fs.existsSync(framePath)) {
          const frameStats = fs.statSync(framePath);
          console.log(`Frame ${i + 1} created successfully:`, {
            path: framePath,
            size: frameStats.size,
            sizeInKB: (frameStats.size / 1024).toFixed(2)
          });
          framePaths.push(framePath);
        } else {
          console.error(`❌ ERROR: Frame ${i + 1} was not created at: ${framePath}`);
        }
      } catch (frameError: any) {
        console.error(`❌ ERROR: Failed to extract frame ${i + 1} at timestamp ${timestamp},`, {
          framePath,
          error: frameError.message,
          cmd: frameError.cmd,
          stdout: frameError.stdout,
          stderr: frameError.stderr
        });
        
        // Dont break the loop, try to continue with other frames
        continue;
      }
    }
    
    console.log(`Successfully extracted ${framePaths.length}/${actualFrameCount} key frames`);
    return framePaths;
    
  } catch (error: any) {
    console.error('Key frame extraction failed:', error);
    console.error('Extraction error details:', {
      message: error.message,
      code: error.code,
      cmd: error.cmd,
      stdout: error.stdout,
      stderr: error.stderr
    });
    
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