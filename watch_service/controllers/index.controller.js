import { indexVideo } from '../elasticsearch/client.js';

const indexVideoData = async (req, res) => {
    try {
        const videoData = req.body;
        
        if (!videoData.title || !videoData.url) {
            return res.status(400).json({ error: 'Missing required fields: title and url are required' });
        }

        await indexVideo(videoData);
        
        return res.status(200).json({ 
            message: 'Video indexed successfully',
            data: videoData
        });
    } catch (error) {
        console.error('Error indexing video:', error);
        return res.status(500).json({ 
            error: 'Failed to index video',
            details: error.message
        });
    }
};

export default indexVideoData;