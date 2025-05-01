import AWS from "aws-sdk";

// Configure S3 bucket CORS
async function configureBucketCors(s3, bucket) {
    try {
        const corsConfig = {
            CORSRules: [
                {
                    AllowedHeaders: ["*"],
                    AllowedMethods: ["GET", "HEAD"],
                    AllowedOrigins: ["*"],  // Updated to allow all origins for development
                    ExposeHeaders: ["ETag", "Content-Length", "Content-Type", "Content-Range", "Accept-Ranges"],
                    MaxAgeSeconds: 3600
                }
            ]
        };

        await s3.putBucketCors({
            Bucket: bucket,
            CORSConfiguration: corsConfig
        }).promise();

        console.log('Successfully updated bucket CORS configuration');
    } catch (error) {
        console.error('Error updating bucket CORS configuration:', error);
    }
}

async function generateSignedUrl(videoUrl) {
    const s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION,
        signatureVersion: 'v4'
    });

    try {
        const url = new URL(videoUrl);
        const bucket = url.hostname.split('.')[0];
        let key = url.pathname.substring(1);
        key = decodeURIComponent(key);
        
        // Check if this is an HLS stream
        if (key.includes('/hls/')) {
            // Get both the master playlist and segment URLs
            const masterKey = key;
            const hlsBasePath = key.substring(0, key.lastIndexOf('/'));
            
            // Sign the master playlist
            const masterParams = {
                Bucket: bucket,
                Key: masterKey,
                Expires: 3600,
                ResponseContentType: 'application/vnd.apple.mpegurl',
                ResponseCacheControl: 'max-age=5'  // Short cache for master playlist
            };
            
            // Sign URLs for potential segment patterns
            const segmentParams = {
                Bucket: bucket,
                Key: `${hlsBasePath}/*`,
                Expires: 3600,
                ResponseCacheControl: 'max-age=31536000'  // Long cache for segments
            };

            // Configure CORS for the bucket
            await configureBucketCors(s3, bucket);

            const masterUrl = await new Promise((resolve, reject) => {
                s3.getSignedUrl('getObject', masterParams, (err, url) => {
                    if (err) reject(err);
                    else resolve(url);
                });
            });

            const segmentUrl = await new Promise((resolve, reject) => {
                s3.getSignedUrl('getObject', segmentParams, (err, url) => {
                    if (err) reject(err);
                    else resolve(url);
                });
            });

            return { 
                signedUrl: masterUrl,
                type: 'hls',
                baseUrl: segmentUrl.split('*')[0]  // Base URL for segments
            };
        } else {
            // Regular MP4 file
            const params = {
                Bucket: bucket,
                Key: key,
                Expires: 3600,
                ResponseContentType: 'video/mp4',
                ResponseContentDisposition: 'inline'
            };

            await configureBucketCors(s3, bucket);

            const signedUrl = await new Promise((resolve, reject) => {
                s3.getSignedUrl('getObject', params, (err, url) => {
                    if (err) reject(err);
                    else resolve(url);
                });
            });

            return { 
                signedUrl,
                type: 'mp4'
            };
        }
    } catch (error) {
        console.error('Error processing video URL:', error);
        throw new Error(`Invalid video URL format: ${error.message}`);
    }
}

const watchVideo = async (req, res) => {
    try {
        const videoUrl = req.query.url;
        if (!videoUrl) {
            return res.status(400).json({ error: 'Video URL is required' });
        }

        console.log('Processing video URL request:', videoUrl);
        const urlData = await generateSignedUrl(videoUrl);
        
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');
        
        res.json(urlData);
    } catch (err) {
        console.error('Error handling video request:', err);
        res.status(500).json({ 
            error: 'Failed to generate video URL', 
            details: err.message,
            originalUrl: req.query.url 
        });
    }
};

export default watchVideo;
