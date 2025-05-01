import AWS from 'aws-sdk';
import { addVideoDetailsToDB } from '../db/db.js';
import { pushVideoForEncodingToKafka } from './kafkapublisher.controller.js';

// Initialize upload
export const initializeUpload = async (req, res) => {
   try {
       console.log('Initialising Upload');
       const {filename} = req.body;
       if (!filename) {
           return res.status(400).json({ error: 'Filename is required' });
       }

       const s3 = new AWS.S3({
           accessKeyId: process.env.AWS_ACCESS_KEY_ID,
           secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
           region: process.env.AWS_REGION
       });

       const bucketName = process.env.AWS_BUCKET;
       const key = `${filename}-${Date.now()}.mp4`;

       const createParams = {
           Bucket: bucketName,
           Key: key,
           ContentType: 'video/mp4'
       };

       const multipartParams = await s3.createMultipartUpload(createParams).promise();
       console.log("multipartparams---- ", multipartParams);
       const uploadId = multipartParams.UploadId;

       res.status(200).json({ uploadId, key });
   } catch (err) {
       console.error('Error initializing upload:', err);
       res.status(500).json({ error: 'Upload initialization failed' });
   }
};

// Upload chunk
export const uploadChunk = async (req, res) => {
   try {
       console.log('Uploading Chunk');
       const { key, chunkIndex, uploadId } = req.body;
       if (!key || !uploadId) {
           return res.status(400).json({ error: 'Missing key or uploadId' });
       }

       const s3 = new AWS.S3({
           accessKeyId: process.env.AWS_ACCESS_KEY_ID,
           secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
           region: process.env.AWS_REGION
       });
       const bucketName = process.env.AWS_BUCKET;

       const partParams = {
           Bucket: bucketName,
           Key: key,
           UploadId: uploadId,
           PartNumber: parseInt(chunkIndex) + 1,
           Body: req.file.buffer,
       };

       const data = await s3.uploadPart(partParams).promise();
       console.log("Part upload successful:", data);
       res.status(200).json({ 
           success: true,
           ETag: data.ETag
       });
   } catch (err) {
       console.error('Error uploading chunk:', err);
       res.status(500).json({
           error: 'Chunk could not be uploaded',
           details: err.message
       });
   }
};

// Complete upload
export const completeUpload = async (req, res) => {
    try {
        console.log('Completing Upload');
        const { uploadId, key, title, description, author } = req.body;
        
        if (!uploadId || !key) {
            return res.status(400).json({ error: 'Missing required parameters: uploadId or key' });
        }

        const s3 = new AWS.S3({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            region: process.env.AWS_REGION
        });
        
        const bucketName = process.env.AWS_BUCKET;

        const completeParams = {
            Bucket: bucketName,
            Key: key,
            UploadId: uploadId,
        };

        // Listing parts using promise
        const data = await s3.listParts(completeParams).promise();

        if (!data.Parts || data.Parts.length === 0) {
            throw new Error('No parts found for the upload');
        }

        const parts = data.Parts.map(part => ({
            ETag: part.ETag,
            PartNumber: part.PartNumber
        })).sort((a, b) => a.PartNumber - b.PartNumber);

        completeParams.MultipartUpload = { Parts: parts };

        // Complete S3 upload
        const uploadResult = await s3.completeMultipartUpload(completeParams).promise();
        console.log("S3 upload completed successfully:", uploadResult);

        try {
            // Send to Kafka before adding to DB
            await pushVideoForEncodingToKafka(title, uploadResult.Location);
            
            // Only add to DB if Kafka message was successful
            await addVideoDetailsToDB(title, description, author, uploadResult.Location);
            
            return res.status(200).json({ 
                message: "Upload successful and queued for processing",
                location: uploadResult.Location
            });
        } catch (processingError) {
            // If Kafka fails, we should cleanup the S3 upload
            try {
                await s3.deleteObject({
                    Bucket: bucketName,
                    Key: key
                }).promise();
            } catch (cleanupError) {
                console.error('Error cleaning up S3 object after Kafka failure:', cleanupError);
            }
            
            throw new Error('Failed to process video: ' + processingError.message);
        }
    } catch (error) {
        console.error('Error in upload process:', error);
        return res.status(500).json({
            error: error.message || 'Upload failed'
        });
    }
};

export const uploadToDb = async (req, res) => {
    console.log("Adding details to DB");
    try {
        const videoDetails = req.body;
        await addVideoDetailsToDB(videoDetails.title, videoDetails.description, videoDetails.author, videoDetails.url);    
        return res.status(200).send("success");
    } catch (error) {
        console.log("Error in adding to DB ", error);
        return res.status(400).send(error);
    }
}

