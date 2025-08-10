import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import { VideoProcessingResult, FFprobeOutput, FFprobeStream } from '../../../types/video-processing';

const execAsync = promisify(exec);

/**
 * Download YouTube video using yt-dlp
 */
export async function downloadYouTubeVideo(videoId: string, outputDir: string = '/tmp'): Promise<VideoProcessingResult> {
  try {
    console.log(`Starting video download for: ${videoId}`);
    console.log(`Output directory: ${outputDir}`);
    
    // Use yt-dlp to download video with better format selection
    const outputPath = `${outputDir}/${videoId}.mp4`;
    
    // Try multiple download strategies to handle YouTube's SABR streaming restrictions
    const downloadStrategies = [
      // Strategy 1: Android client with simple format
      `yt-dlp --extractor-args "youtube:player_client=android" -f "best[height<=720]/best" -o "${outputPath}" "https://www.youtube.com/watch?v=${videoId}"`,
      // Strategy 2: Web client with fallback
      `yt-dlp --extractor-args "youtube:player_client=web" -f "best[height<=720]/best" -o "${outputPath}" "https://www.youtube.com/watch?v=${videoId}"`,
      // Strategy 3: TV client as last resort
      `yt-dlp --extractor-args "youtube:player_client=tv" -f "best" -o "${outputPath}" "https://www.youtube.com/watch?v=${videoId}"`
    ];
    
    let lastError: Error | null = null;
    
    for (let i = 0; i < downloadStrategies.length; i++) {
      try {
        const command = downloadStrategies[i];
        console.log(`Trying download strategy ${i + 1}: ${command}`);
        
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
        
        // Check if file size is suspiciously small (less than 10KB for a video)
        if (stats.size < 10240) {
          console.warn(`Warning: Video file is suspiciously small (${stats.size} bytes). This might indicate a download issue.`);
          
          // Try to read the first few bytes to see if it's an error page
          const fileContent = fs.readFileSync(outputPath, 'utf8').substring(0, 500);
          if (fileContent.includes('<!DOCTYPE html>') || fileContent.includes('<html>')) {
            throw new Error('Downloaded file appears to be an HTML error page, not a video file');
          }
        }
        
        // Verify video file integrity with ffprobe
        const probeCommand = `ffprobe -v quiet -print_format json -show_format -show_streams "${outputPath}"`;
        console.log(`Running ffprobe: ${probeCommand}`);
        
        const { stdout: probeStdout, stderr: probeStderr } = await execAsync(probeCommand);
        
        if (probeStderr) {
          console.error('ffprobe stderr:', probeStderr);
        }
        
        const probeData = JSON.parse(probeStdout) as FFprobeOutput;
        console.log('Video file analysis:', {
          duration: probeData.format?.duration,
          size: probeData.format?.size,
          bitrate: probeData.format?.bit_rate,
          videoStreams: probeData.streams?.filter((s: FFprobeStream) => s.codec_type === 'video').length,
          audioStreams: probeData.streams?.filter((s: FFprobeStream) => s.codec_type === 'audio').length
        });
        
        // Check if video stream has proper pixel format
        const videoStream = probeData.streams?.find((s: FFprobeStream) => s.codec_type === 'video');
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
        
      } catch (strategyError: unknown) {
        lastError = strategyError as Error;
        console.warn(`Download strategy ${i + 1} failed:`, lastError.message);
        
        // Clean up any partial download
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
        
        // If this is the last strategy, throw the error
        if (i === downloadStrategies.length - 1) {
          throw lastError;
        }
        
        // Wait a bit before trying the next strategy
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // This should never be reached, but TypeScript requires it
    throw new Error('All download strategies failed');
    
  } catch (error: unknown) {
    const downloadError = error as Error;
    console.error('Video download failed:', downloadError);
    return {
      videoPath: '',
      duration: 0,
      resolution: 'unknown',
      fileSize: 0,
      success: false,
      error: downloadError.message
    };
  }
} 