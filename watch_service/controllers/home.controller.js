import { PrismaClient } from "@prisma/client"

const getAllVideos = async(req, res) => {
    const prisma = new PrismaClient();
    try {
        const allData = await prisma.videoData.findMany({
            orderBy: {
                id: 'desc'  // Order by id instead of createdAt for now
            }
        });
        console.log('Fetched videos:', allData);
        await prisma.$disconnect();
        return res.status(200).json(allData);
    } catch (error) {
        console.error('Error fetching data:', error);
        await prisma.$disconnect();
        return res.status(500).json({ error: 'Failed to fetch videos' });
    }
}

export default getAllVideos;
