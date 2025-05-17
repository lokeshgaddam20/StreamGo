import dotenv from "dotenv";
import AWS from 'aws-sdk';
import fs from "fs";
import path from "path";
import convertToHLS from './transcode.js';
import stream from 'stream';
import { promisify } from 'util';
import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';

dotenv.config();

const pipeline = promisify(stream.pipeline);

// Function to generate thumbnail from video using ffmpeg
const generateVideoThumbnail = async (videoPath, outputDir, sanitizedTitle) => {
    console.log('Generating thumbnail for video:', videoPath);
    console.log('Using FFmpeg path:', ffmpegPath);
    
    // Create thumbnails directory if it doesn't exist
    const thumbnailDir = path.join(outputDir, 'thumbnails', sanitizedTitle);
    if (!fs.existsSync(thumbnailDir)) {
        fs.mkdirSync(thumbnailDir, { recursive: true });
        console.log('Created thumbnail directory:', thumbnailDir);
    }
    
    const thumbnailPath = path.join(thumbnailDir, 'thumbnail.jpg');
    
    return new Promise((resolve, reject) => {
        // Use the ffmpeg-static path instead of relying on system ffmpeg
        const ffmpeg = spawn(ffmpegPath, [
            '-i', videoPath,
            '-ss', '00:00:03', // Take frame at 3 seconds
            '-vframes', '1',
            '-q:v', '2', // High quality
            '-vf', 'scale=480:270:force_original_aspect_ratio=decrease,pad=480:270:(ow-iw)/2:(oh-ih)/2', // 16:9 aspect ratio
            thumbnailPath
        ]);
        
        let ffmpegLogs = '';
        
        ffmpeg.stderr.on('data', (data) => {
            const logData = data.toString();
            ffmpegLogs += logData;
            console.log(`ffmpeg: ${logData}`);
        });
        
        ffmpeg.on('close', (code) => {
            if (code === 0) {
                console.log('Thumbnail generated successfully:', thumbnailPath);
                resolve(thumbnailPath);
            } else {
                console.error(`ffmpeg process exited with code ${code}`);
                console.error('Full ffmpeg logs:', ffmpegLogs);
                reject(new Error(`Thumbnail generation failed with code ${code}`));
            }
        });
        
        ffmpeg.on('error', (err) => {
            console.error('Error generating thumbnail:', err);
            console.error('Full ffmpeg logs:', ffmpegLogs);
            reject(err);
        });
    });
};

const s3ToS3 = async (sourceUrl, title) => {
    console.log('Starting S3 to S3 transcoding process:', { sourceUrl, title });
    
    const s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION
    });

    try {
        console.log('Creating output directory...');
        if (!fs.existsSync('output')) {
            fs.mkdirSync('output');
            console.log('Output directory created');
        }

        // Parse the S3 URL
        console.log('Parsing source URL...');
        const url = new URL(sourceUrl);
        const sourceBucket = url.hostname.split('.')[0];
        let sourceKey = url.pathname.substring(1);
        // Properly decode the key
        sourceKey = decodeURIComponent(sourceKey.split('?')[0]);
        console.log('Source details:', { sourceBucket, sourceKey });

        // Download the source video
        console.log('Downloading source video from S3...');
        const inputPath = path.join('output', `source_${title}.mp4`);
        const writeStream = fs.createWriteStream(inputPath);
        
        await new Promise((resolve, reject) => {
            console.log('Starting S3 download stream...');
            s3.getObject({
                Bucket: sourceBucket,
                Key: sourceKey
            }).createReadStream()
            .on('error', (error) => {
                console.error('Error during S3 download:', error);
                reject(error);
            })
            .pipe(writeStream)
            .on('finish', () => {
                console.log('Source video download completed');
                resolve();
            })
            .on('error', reject);
        });

        // Sanitize the title for S3 folder usage
        const sanitizedTitle = title.replace(/[^a-zA-Z0-9_\-]/g, '_');
        
        let thumbnailPath;
        
        // Generate thumbnail for the video
        try {
            console.log('Generating thumbnail...');
            thumbnailPath = await generateVideoThumbnail(inputPath, 'output', sanitizedTitle);
            console.log('Thumbnail generated at:', thumbnailPath);
        } catch (thumbnailError) {
            // Log but continue if thumbnail generation fails
            console.error('Thumbnail generation failed, continuing with HLS conversion:', thumbnailError);
        }

        // Convert to HLS
        console.log('Starting HLS conversion...');
        const { masterPlaylist, segments } = await convertToHLS(inputPath, sanitizedTitle);
        console.log('HLS conversion completed:', { 
            masterPlaylistSize: masterPlaylist.length,
            segmentCount: segments ? segments.length : 'unknown'
        });

        // Upload all files to S3
        console.log('Starting upload of HLS files to S3...');
        const uploadPromises = [];
        // Use sanitizedTitle as the HLS folder
        const destinationPath = `hls/${sanitizedTitle}`;

        // Upload master playlist
        console.log('Uploading master playlist...');
        uploadPromises.push(
            s3.upload({
                Bucket: sourceBucket,
                Key: `${destinationPath}/master.m3u8`,
                Body: masterPlaylist,
                ContentType: 'application/x-mpegURL'
            }).promise()
        );

        // Upload variant playlists and segments
        console.log('Uploading variant playlists and segments...');
        const outputFiles = fs.readdirSync('output');
        console.log(`Found ${outputFiles.length} files to upload`);
        
        for (const file of outputFiles) {
            if (file.endsWith('.m3u8') || file.endsWith('.ts')) {
                console.log(`Uploading file: ${file}`);
                uploadPromises.push(
                    s3.upload({
                        Bucket: sourceBucket,
                        Key: `${destinationPath}/${file}`,
                        Body: fs.readFileSync(path.join('output', file)),
                        ContentType: file.endsWith('.m3u8') ? 'application/x-mpegURL' : 'video/MP2T'
                    }).promise()
                );
            }
        }
        
        // Upload thumbnail if generated successfully
        if (thumbnailPath && fs.existsSync(thumbnailPath)) {
            console.log('Uploading thumbnail...');
            uploadPromises.push(
                s3.upload({
                    Bucket: sourceBucket,
                    Key: `thumbnails/${sanitizedTitle}/thumbnail.jpg`,
                    Body: fs.readFileSync(thumbnailPath),
                    ContentType: 'image/jpeg'
                }).promise()
            );
        }

        console.log('Waiting for all uploads to complete...');
        const uploadResults = await Promise.all(uploadPromises);
        console.log('All files uploaded successfully');

        // Clean up
        console.log('Cleaning up temporary files...');
        fs.rmSync('output', { recursive: true, force: true });
        fs.mkdirSync('output');
        console.log('Cleanup completed');

        // Return the HLS master playlist URL
        const hlsUrl = `https://${sourceBucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${destinationPath}/master.m3u8`;
        console.log('Generated HLS URL:', hlsUrl);
        
        // Also generate and log the thumbnail URL
        const thumbnailUrl = `https://${sourceBucket}.s3.${process.env.AWS_REGION}.amazonaws.com/thumbnails/${sanitizedTitle}/thumbnail.jpg`;
        console.log('Generated thumbnail URL:', thumbnailUrl);
        
        return hlsUrl;
    } catch (error) {
        console.error('Error in s3ToS3:', {
            error: error.message,
            stack: error.stack,
            sourceUrl,
            title
        });
        throw error;
    }
};

export default s3ToS3;