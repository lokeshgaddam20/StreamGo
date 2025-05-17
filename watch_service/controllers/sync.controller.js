import { PrismaClient } from '@prisma/client';
import { syncDatabaseToElasticsearch, initializeIndex } from '../elasticsearch/client.js';

const prisma = new PrismaClient();

/**
 * Synchronizes the database with Elasticsearch
 * This can be called on system startup or via an admin API endpoint
 */
const syncElasticsearch = async (req, res) => {
    try {
        // First ensure the index exists
        await initializeIndex();
        
        // Then sync all data
        const result = await syncDatabaseToElasticsearch(prisma);
        
        res.status(200).json({
            message: 'Database synchronized with Elasticsearch',
            indexed: result.indexed,
            success: result.success
        });
    } catch (error) {
        console.error('Error in syncElasticsearch controller:', error);
        res.status(500).json({ 
            error: 'Failed to sync database with Elasticsearch',
            details: error.message
        });
    } finally {
        await prisma.$disconnect();
    }
};

export default syncElasticsearch;