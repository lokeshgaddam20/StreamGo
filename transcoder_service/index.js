import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import KafkaConfig from "./kafka/kafka.js"
import convertToHLS from "./hls/transcode.js"
import s3ToS3 from "./hls/s3Tos3.js"

dotenv.config();
const port = 8081

const app = express();
app.use(cors({
    allowedHeaders: ["*"],
    origin: "*"
}));

app.use(express.json());

app.get('/', (req, res) => {
    res.send('HHLD YouTube service transcoder')
})

const handleVideoTranscode = async (message) => {
    try {
        console.log('==================== Transcoding Process Started ====================');
        console.log('Raw message received:', message);
        
        const videoData = JSON.parse(message);
        console.log('Parsed video data:', {
            title: videoData.title,
            url: videoData.url,
            timestamp: videoData.timestamp
        });
        
        console.log('Starting S3 download and HLS conversion...');
        const hlsUrl = await s3ToS3(videoData.url, videoData.title);
        
        console.log('Transcoding completed successfully!');
        console.log('HLS master playlist URL:', hlsUrl);
        console.log('==================== Transcoding Process Completed ====================');
    } catch (error) {
        console.error('==================== Transcoding Process Failed ====================');
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            videoData: message
        });
    }
}

const startKafkaConsumer = async () => {
    try {
        const kafkaConfig = new KafkaConfig();
        console.log('Initializing Kafka consumer...');
        console.log('Connecting to topic: transcode');
        await kafkaConfig.consume("transcode", handleVideoTranscode);
        console.log('Kafka consumer initialized and waiting for messages');
    } catch (error) {
        console.error('Failed to start Kafka consumer:', {
            error: error.message,
            stack: error.stack
        });
        process.exit(1);
    }
}

// Start the Kafka consumer
startKafkaConsumer();

app.listen(port, () => {
    console.log(`Transcoder service is listening at http://localhost:${port}`);
    console.log('Ready to process video transcoding requests');
});

