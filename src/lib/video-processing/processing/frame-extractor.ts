import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as Sentry from '@sentry/nextjs';

const execAsync = promisify(exec);

/**
 * Get video duration using ffprobe
 */
async function getVideoDuration(videoPath: string): Promise<number> {
  try {
    const command = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${videoPath}"`;
    const { stdout } = await execAsync(command);
    return parseFloat(stdout.trim()) || 0;
  } catch (error: unknown) {
    console.error('Failed to get video duration:', error);
    return 0;
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
      } catch (frameError: unknown) {
        const error = frameError as Error & { cmd?: string; stdout?: string; stderr?: string };
        console.error(`❌ ERROR: Failed to extract frame ${i + 1} at timestamp ${timestamp},`, {
          framePath,
          error: error.message,
          cmd: error.cmd,
          stdout: error.stdout,
          stderr: error.stderr
        });
        
        // Dont break the loop, try to continue with other frames
        continue;
      }
    }
    
    console.log(`Successfully extracted ${framePaths.length}/${actualFrameCount} key frames`);
    return framePaths;
    
  } catch (error: unknown) {
    const extractionError = error as Error & { code?: string; cmd?: string; stdout?: string; stderr?: string };
    console.error('Key frame extraction failed:', extractionError);
    console.error('Extraction error details:', {
      message: extractionError.message,
      code: extractionError.code,
      cmd: extractionError.cmd,
      stdout: extractionError.stdout,
      stderr: extractionError.stderr
    });
    
    Sentry.captureException(extractionError, {
      tags: { component: 'video-processing', action: 'extract-frames' },
      extra: { videoPath, outputDir, frameCount }
    });
    return [];
  }
} 