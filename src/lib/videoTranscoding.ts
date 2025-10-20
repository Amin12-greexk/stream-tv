// src/lib/videoTranscoding.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

export interface TranscodingOptions {
  inputPath: string;
  outputDir: string;
  filename: string;
}

export interface VideoVariant {
  resolution: string;
  bitrate: string;
  width: number;
  height: number;
}

const VIDEO_VARIANTS: VideoVariant[] = [
  { resolution: '360p', bitrate: '800k', width: 640, height: 360 },
  { resolution: '480p', bitrate: '1200k', width: 854, height: 480 },
  { resolution: '720p', bitrate: '2500k', width: 1280, height: 720 },
  { resolution: '1080p', bitrate: '5000k', width: 1920, height: 1080 }
];

export class VideoTranscoder {
  static async generateHLS(options: TranscodingOptions): Promise<string> {
    const { inputPath, outputDir, filename } = options;
    const baseName = path.basename(filename, path.extname(filename));
    const hlsDir = path.join(outputDir, 'hls', baseName);
    
    // Create HLS directory
    await fs.mkdir(hlsDir, { recursive: true });
    
    // Generate master playlist
    const masterPlaylist = path.join(hlsDir, 'master.m3u8');
    let masterContent = '#EXTM3U\n#EXT-X-VERSION:3\n';
    
    // Transcode each variant
    for (const variant of VIDEO_VARIANTS) {
      const variantDir = path.join(hlsDir, variant.resolution);
      await fs.mkdir(variantDir, { recursive: true });
      
      const playlistPath = `${variant.resolution}/index.m3u8`;
      const segmentPath = path.join(variantDir, 'segment%03d.ts');
      
      // FFmpeg command for HLS
      const ffmpegCmd = `ffmpeg -i "${inputPath}" \
        -vf scale=${variant.width}:${variant.height} \
        -c:v h264 -b:v ${variant.bitrate} \
        -c:a aac -b:a 128k \
        -hls_time 10 \
        -hls_list_size 0 \
        -hls_segment_filename "${segmentPath}" \
        -f hls "${path.join(variantDir, 'index.m3u8')}"`;
      
      try {
        await execAsync(ffmpegCmd);
        
        // Add to master playlist
        masterContent += `#EXT-X-STREAM-INF:BANDWIDTH=${parseInt(variant.bitrate) * 1000},RESOLUTION=${variant.width}x${variant.height}\n`;
        masterContent += `${playlistPath}\n`;
      } catch (error) {
        console.error(`Failed to transcode ${variant.resolution}:`, error);
      }
    }
    
    // Write master playlist
    await fs.writeFile(masterPlaylist, masterContent);
    
    return path.relative(outputDir, masterPlaylist);
  }
  
  static async generateThumbnail(videoPath: string, outputPath: string): Promise<void> {
    const cmd = `ffmpeg -i "${videoPath}" -ss 00:00:01.000 -vframes 1 -vf scale=320:180 "${outputPath}"`;
    await execAsync(cmd);
  }
  
  static async getVideoDuration(videoPath: string): Promise<number> {
    const cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`;
    const { stdout } = await execAsync(cmd);
    return parseFloat(stdout.trim());
  }
  
  static async optimizeImage(inputPath: string, outputPath: string): Promise<void> {
    // Generate multiple sizes for responsive loading
    const sizes = [
      { suffix: '_thumb', width: 320 },
      { suffix: '_small', width: 640 },
      { suffix: '_medium', width: 1280 },
      { suffix: '_large', width: 1920 }
    ];
    
    const ext = path.extname(outputPath);
    const base = path.basename(outputPath, ext);
    const dir = path.dirname(outputPath);
    
    for (const size of sizes) {
      const sizedPath = path.join(dir, `${base}${size.suffix}${ext}`);
      const cmd = `ffmpeg -i "${inputPath}" -vf scale=${size.width}:-1 -q:v 2 "${sizedPath}"`;
      await execAsync(cmd);
    }
    
    // Also create WebP version for better compression
    const webpPath = path.join(dir, `${base}.webp`);
    const webpCmd = `ffmpeg -i "${inputPath}" -c:v libwebp -quality 80 "${webpPath}"`;
    await execAsync(webpCmd);
  }
}