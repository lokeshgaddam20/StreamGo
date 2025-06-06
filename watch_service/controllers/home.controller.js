import { PrismaClient } from "@prisma/client"
import { searchVideos } from "../elasticsearch/client.js"

const getAllVideos = async(req, res) => {
    const prisma = new PrismaClient();
    try {
        const searchQuery = req.query.q;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;

        if (searchQuery) {
            // Use Elasticsearch for search queries
            const searchResults = await searchVideos(searchQuery, page, limit);
            
            // Transform the search results to match the expected format
            const formattedResults = {
                videos: searchResults.documents.map(doc => ({
                    id: doc.id,
                    title: doc.title,
                    description: doc.description,
                    url: doc.url,
                    author: doc.author,
                    createdAt: doc.createdAt,
                    highlights: doc.highlights
                })),
                total: searchResults.total,
                page,
                limit
            };
            
            return res.status(200).json(formattedResults);
        }

        // Default behavior - get all videos ordered by creation date
        const allData = await prisma.videoData.findMany({
            orderBy: {
                createdAt: 'desc'
            },
            skip: (page - 1) * limit,
            take: limit
        });

        const total = await prisma.videoData.count();

        console.log('Fetched videos:', allData);
        await prisma.$disconnect();
        return res.status(200).json({
            videos: allData,
            total,
            page,
            limit
        });
    } catch (error) {
        console.error('Error fetching data:', error);
        await prisma.$disconnect();
        return res.status(500).json({ error: 'Failed to fetch videos' });
    }
}

export default getAllVideos;