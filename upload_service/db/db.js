import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function addVideoDetailsToDB(title, description, author, url) {
  try {
    // Ensure URL is properly encoded for storage
    const encodedUrl = encodeURI(url);
    
    const video = await prisma.videoData.create({
      data: {
        title,
        description,
        author,
        url: encodedUrl
      }
    })
    console.log('Video data stored:', video);
    return video
  } catch (error) {
    console.error('Error adding video data to DB:', error)
    throw error
  }
}

// Handle cleanup on application shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})