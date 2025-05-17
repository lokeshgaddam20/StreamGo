import { PrismaClient } from "@prisma/client";
import { indexVideo } from '../elasticsearch/client.js';

// Initialize Prisma client
const prisma = new PrismaClient();

const indexVideoData = async (req, res) => {
    try {
        const videoData = req.body;
        
        // Validate required fields
        if (!videoData.title || !videoData.url) {
            return res.status(400).json({ error: 'Video title and URL are required' });
        }
        
        // First, save to database using Prisma
        const savedVideo = await prisma.videoData.create({
            data: {
                ...videoData,
                // Ensure createdAt is set
                createdAt: videoData.createdAt || new Date()
            }
        });
        
        // Then index in Elasticsearch
        // Make sure we format the document properly
        const esDocument = {
            id: savedVideo.id.toString(), // Ensure ID is a string for ES
            title: savedVideo.title,
            text: `${savedVideo.title} ${savedVideo.description || ''} ${savedVideo.author || ''}`,
            description: savedVideo.description || '',
            url: savedVideo.url,
            author: savedVideo.author || '',
            createdAt: savedVideo.createdAt
        };
        
        const id = await indexVideo(esDocument);
        
        console.log(`Video saved to database with ID ${savedVideo.id} and indexed in Elasticsearch with ID ${id}`);
        
        res.status(201).json({ 
            message: 'Video saved and indexed successfully', 
            id: savedVideo.id,
            esId: id
        });
    } catch (error) {
        console.error('Error in indexVideoData controller:', error);
        res.status(500).json({ error: 'Failed to save or index video', details: error.message });
    } finally {
        await prisma.$disconnect();
    }
};

export default indexVideoData;