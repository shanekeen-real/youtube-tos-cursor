import { unlink } from 'fs';
import { promisify } from 'util';

const unlinkAsync = promisify(unlink);

/**
 * Clean up temporary video files
 */
export async function cleanupVideoFiles(videoPath: string, framePaths: string[] = []): Promise<void> {
  try {
    // Remove video file
    if (videoPath) {
      await unlinkAsync(videoPath);
      console.log(`Cleaned up video file: ${videoPath}`);
    }
    
    // Remove frame files
    for (const framePath of framePaths) {
      try {
        await unlinkAsync(framePath);
        console.log(`Cleaned up frame file: ${framePath}`);
      } catch (error) {
        console.warn(`Failed to clean up frame file: ${framePath}`, error);
      }
    }
  } catch (error: unknown) {
    console.error('Cleanup failed:', error);
  }
} 