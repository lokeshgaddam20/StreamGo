import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import fs from "fs";
import path from "path";

ffmpeg.setFfmpegPath(ffmpegStatic);

const convertToHLS = async (inputPath, title) => {
    console.log('Starting HLS conversion for:', { inputPath, title });
    
    const outputDir = 'output';
    const sanitizedTitle = title.replace(/\s+/g, '_');

    const presets = [
        {
            name: '240p',
            bitrate: '400k',
            resolution: '426x240',
            maxrate: '500k',
            bufsize: '800k',
            bandwidth: '400000',
        },
        {
            name: '360p',
            bitrate: '800k',
            resolution: '640x360',
            maxrate: '900k',
            bufsize: '1400k',
            bandwidth: '800000',
        },
        {
            name: '480p',
            bitrate: '1500k',
            resolution: '854x480',
            maxrate: '1600k',
            bufsize: '2400k',
            bandwidth: '1500000',
        },
        {
            name: '720p',
            bitrate: '2800k',
            resolution: '1280x720',
            maxrate: '3000k',
            bufsize: '4400k',
            bandwidth: '2800000',
        },
        {
            name: '1080p',
            bitrate: '5000k',
            resolution: '1920x1080',
            maxrate: '5500k',
            bufsize: '7800k',
            bandwidth: '5000000',
        }
    ];

    const transcodeOptions = {
        keyInterval: 48, // Shorter key interval for faster quality switching
        segmentDuration: 4, // Shorter segments for faster adaptation
        hlsTime: 4,
        hlsListSize: 5, // Reduced list size for faster startup
        startNumber: 0,
        // Add additional FFmpeg parameters for better quality adaptation
        additionalOptions: [
            '-sc_threshold', '0', // Disable scene change detection for more consistent segments
            '-g', '48', // GOP size matching keyInterval
            '-preset', 'veryfast', // Faster encoding for reduced latency
            '-profile:v', 'main', // Main profile for better device compatibility
            '-movflags', '+faststart', // Enable fast start for quicker playback
            '-b_strategy', '0', // Consistent B-frame usage
            '-bf', '2', // Use 2 B-frames for efficiency
        ]
    };

    const variants = [];
    const segmentPromises = [];

    for (const preset of presets) {
        const variantName = `${sanitizedTitle}_${preset.resolution}`;
        const playlistPath = path.join(outputDir, `${variantName}.m3u8`);
        const segmentPattern = path.join(outputDir, `${variantName}_%03d.ts`);

        console.log(`Creating variant: ${preset.resolution} at ${preset.bitrate}`);

        const transcodePromise = new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .outputOptions([
                    '-c:v h264',
                    `-b:v ${preset.bitrate}`,
                    `-maxrate ${preset.maxrate}`,
                    `-bufsize ${preset.bufsize}`,
                    '-c:a aac',
                    `-b:a 128k`,
                    `-vf scale=${preset.resolution}`,
                    `-g ${transcodeOptions.keyInterval}`,
                    `-hls_time ${transcodeOptions.hlsTime}`,
                    `-hls_list_size ${transcodeOptions.hlsListSize}`,
                    `-start_number ${transcodeOptions.startNumber}`,
                    ...transcodeOptions.additionalOptions,
                    '-hls_playlist_type vod',
                    '-hls_segment_type mpegts',
                    '-hls_segment_filename', segmentPattern,
                    '-f hls'
                ])
                .output(playlistPath)
                .on('start', cmd => console.log(`Starting FFmpeg: ${cmd}`))
                .on('progress', progress => {
                    if (progress.percent) {
                        console.log(`${preset.resolution}: ${progress.percent.toFixed(2)}%`);
                    }
                })
                .on('end', () => {
                    console.log(`Finished transcoding ${preset.resolution}`);
                    variants.push({
                        resolution: preset.resolution,
                        bandwidth: parseInt(preset.bandwidth),
                        path: path.basename(playlistPath)
                    });
                    resolve();
                })
                .on('error', (err) => {
                    console.error(`Error transcoding ${preset.resolution}:`, err);
                    reject(err);
                })
                .run();
        });

        segmentPromises.push(transcodePromise);
    }

    // Wait for all variants to finish
    await Promise.all(segmentPromises);

    // Create master playlist
    console.log('Creating master playlist');
    const masterPlaylist = ['#EXTM3U', '#EXT-X-VERSION:3'];

    // Add variants sorted by bandwidth (highest to lowest)
    variants
        .sort((a, b) => b.bandwidth - a.bandwidth)
        .forEach(variant => {
            masterPlaylist.push(
                `#EXT-X-STREAM-INF:BANDWIDTH=${variant.bandwidth},RESOLUTION=${variant.resolution}`,
                variant.path
            );
        });

    const masterContent = masterPlaylist.join('\n');
    console.log('Master playlist created');

    // Get list of all segment files
    const segments = fs.readdirSync(outputDir)
        .filter(file => file.endsWith('.ts'))
        .map(file => path.basename(file));

    return {
        masterPlaylist: masterContent,
        segments
    };
};

export default convertToHLS;
