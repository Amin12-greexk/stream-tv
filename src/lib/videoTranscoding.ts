// src/lib/videoTranscoding.ts
import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";

function runProcess(command: string, args: string[]) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} exited with code ${code}\n${stderr}`));
    });
  });
}

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
  { resolution: "360p", bitrate: "800k", width: 640, height: 360 },
  { resolution: "480p", bitrate: "1200k", width: 854, height: 480 },
  { resolution: "720p", bitrate: "2500k", width: 1280, height: 720 },
  { resolution: "1080p", bitrate: "5000k", width: 1920, height: 1080 },
];

export class VideoTranscoder {
  static async generateHLS(options: TranscodingOptions): Promise<string> {
    const { inputPath, outputDir, filename } = options;
    const baseName = path.basename(filename, path.extname(filename));
    const hlsDir = path.join(outputDir, "hls", baseName);

    // Create HLS directory
    await fs.mkdir(hlsDir, { recursive: true });

    // Generate master playlist
    const masterPlaylist = path.join(hlsDir, "master.m3u8");
    const masterLines: string[] = [
      "#EXTM3U",
      "#EXT-X-VERSION:3",
      "#EXT-X-INDEPENDENT-SEGMENTS",
    ];

    let successfulVariants = 0;

    // Transcode each variant
    for (const variant of VIDEO_VARIANTS) {
      const variantDir = path.join(hlsDir, variant.resolution);
      await fs.mkdir(variantDir, { recursive: true });

      const playlistPath = `${variant.resolution}/index.m3u8`;
      const segmentPath = path.join(variantDir, "segment%03d.ts");
      const playlistFullPath = path.join(variantDir, "index.m3u8");
      const bitrateKbps = parseInt(variant.bitrate, 10);
      const bufSize = `${Math.max(1, bitrateKbps * 2)}k`;

      try {
        await runProcess("ffmpeg", [
          "-hide_banner",
          "-loglevel",
          "error",
          "-i",
          inputPath,
          "-vf",
          `scale=${variant.width}:${variant.height}`,
          "-c:v",
          "libx264",
          "-preset",
          "veryfast",
          "-b:v",
          variant.bitrate,
          "-maxrate",
          variant.bitrate,
          "-bufsize",
          bufSize,
          "-g",
          "48",
          "-keyint_min",
          "48",
          "-sc_threshold",
          "0",
          "-pix_fmt",
          "yuv420p",
          "-c:a",
          "aac",
          "-b:a",
          "128k",
          "-ac",
          "2",
          "-hls_time",
          "3",
          "-hls_playlist_type",
          "vod",
          "-hls_flags",
          "independent_segments",
          "-hls_list_size",
          "0",
          "-hls_segment_filename",
          segmentPath,
          "-f",
          "hls",
          playlistFullPath,
        ]);

        // Add to master playlist
        masterLines.push(
          `#EXT-X-STREAM-INF:BANDWIDTH=${bitrateKbps * 1000},RESOLUTION=${variant.width}x${variant.height}`
        );
        masterLines.push(playlistPath);
        successfulVariants += 1;
      } catch (error) {
        console.error(`Failed to transcode ${variant.resolution}:`, error);
      }
    }

    if (successfulVariants === 0) {
      throw new Error("HLS transcoding failed (no variants generated)");
    }

    // Write master playlist
    await fs.writeFile(masterPlaylist, `${masterLines.join("\n")}\n`);

    return path.relative(outputDir, masterPlaylist);
  }
  
  static async generateThumbnail(videoPath: string, outputPath: string): Promise<void> {
    await runProcess("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      videoPath,
      "-ss",
      "00:00:01.000",
      "-vframes",
      "1",
      "-vf",
      "scale=320:180",
      outputPath,
    ]);
  }
  
  static async getVideoDuration(videoPath: string): Promise<number> {
    const { stdout } = await runProcess("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      videoPath,
    ]);
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
      await runProcess("ffmpeg", [
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        inputPath,
        "-vf",
        `scale=${size.width}:-1`,
        "-q:v",
        "2",
        sizedPath,
      ]);
    }
    
    // Also create WebP version for better compression
    const webpPath = path.join(dir, `${base}.webp`);
    await runProcess("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      inputPath,
      "-c:v",
      "libwebp",
      "-quality",
      "80",
      webpPath,
    ]);
  }
}
