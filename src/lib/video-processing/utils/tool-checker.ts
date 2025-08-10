import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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
    
    // Try to update yt-dlp to latest version to handle YouTube changes
    try {
      console.log('Checking for yt-dlp updates...');
      await execAsync('yt-dlp -U');
      console.log('yt-dlp updated successfully');
    } catch (updateError) {
      console.warn('Failed to update yt-dlp:', updateError);
      // Continue anyway - the current version might still work
    }
    
    console.log('Tool check results:', {
      ytdlp: { status: results[0].status, error: results[0].status === 'rejected' ? (results[0] as PromiseRejectedResult).reason : null },
      ffmpeg: { status: results[1].status, error: results[1].status === 'rejected' ? (results[1] as PromiseRejectedResult).reason : null },
      ffprobe: { status: results[2].status, error: results[2].status === 'rejected' ? (results[2] as PromiseRejectedResult).reason : null }
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