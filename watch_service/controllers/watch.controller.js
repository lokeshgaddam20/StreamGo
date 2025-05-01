import AWS from "aws-sdk";

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
        key = decodeURIComponent(decodeURIComponent(key));
        key = key.split('?')[0];
        key = key.replace(/\+/g, ' ');

        console.log('Generating signed URL for:', {
            bucket,
            key,
            originalUrl: videoUrl
        });

        const params = {
            Bucket: bucket,
            Key: key,
            Expires: 3600 // URL expires in 1 hour
        };

        const signedUrl = await new Promise((resolve, reject) => {
            s3.getSignedUrl('getObject', params, (err, url) => {
                if (err) {
                    console.error('Error generating signed URL:', err);
                    reject(err);
                } else {
                    console.log('Generated signed URL successfully');
                    resolve(url);
                }
            });
        });
        console.log('Signed URL:', signedUrl);
        return signedUrl;
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
        const signedUrl = await generateSignedUrl(videoUrl);
        
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');
        
        res.json({ signedUrl });
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
