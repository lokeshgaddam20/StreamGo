import dotenv from "dotenv";
import AWS from 'aws-sdk';
import fs from "fs";
import path from "path";
import convertToHLS from './transcode.js';
import stream from 'stream';
import { promisify } from 'util';

dotenv.config();

const pipeline = promisify(stream.pipeline);

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

        // Convert to HLS
        console.log('Starting HLS conversion...');
        const { masterPlaylist, segments } = await convertToHLS(inputPath, title);
        console.log('HLS conversion completed:', { 
            masterPlaylistSize: masterPlaylist.length,
            segmentCount: segments ? segments.length : 'unknown'
        });

        // Upload all files to S3
        console.log('Starting upload of HLS files to S3...');
        const uploadPromises = [];
        const destinationPath = `hls/${title}`;

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

        console.log('Waiting for all uploads to complete...');
        await Promise.all(uploadPromises);
        console.log('All HLS files uploaded successfully');

        // Clean up
        console.log('Cleaning up temporary files...');
        fs.rmSync('output', { recursive: true, force: true });
        fs.mkdirSync('output');
        console.log('Cleanup completed');

        // Return the HLS master playlist URL
        const hlsUrl = `https://${sourceBucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${destinationPath}/master.m3u8`;
        console.log('Generated HLS URL:', hlsUrl);
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
