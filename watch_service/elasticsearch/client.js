import { Client } from '@elastic/elasticsearch';

const client = new Client({
    node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200'
});

async function initializeIndex() {
    try {
        const indexExists = await client.indices.exists({
            index: 'videos'
        });

        if (!indexExists) {
            await client.indices.create({
                index: 'videos',
                body: {
                    mappings: {
                        properties: {
                            title: { type: 'text' },
                            description: { type: 'text' },
                            author: { type: 'keyword' },
                            url: { type: 'keyword' },
                            createdAt: { type: 'date' }
                        }
                    }
                }
            });
            console.log('Successfully created videos index');
        }
        return true;
    } catch (error) {
        console.error('Error initializing Elasticsearch index:', error);
        return false;
    }
}

// Initialize index
initializeIndex();

export async function searchVideos(query, page = 1, limit = 12) {
    const from = (page - 1) * limit;
    
    try {
        const result = await client.search({
            index: 'videos',
            body: {
                from,
                size: limit,
                query: query ? {
                    bool: {
                        should: [
                            {
                                multi_match: {
                                    query,
                                    fields: ['title^2', 'description', 'author'],
                                    fuzziness: 'AUTO'
                                }
                            }
                        ]
                    }
                } : { match_all: {} },
                sort: [
                    { _score: 'desc' },
                    { createdAt: 'desc' }
                ]
            }
        });

        return {
            total: result.hits.total.value,
            videos: result.hits.hits.map(hit => ({
                ...hit._source,
                score: hit._score
            }))
        };
    } catch (error) {
        console.error('Error searching videos:', error);
        return null;
    }
}

export async function indexVideo(video) {
    try {
        await client.index({
            index: 'videos',
            document: {
                ...video,
                createdAt: new Date()
            },
            refresh: true
        });
    } catch (error) {
        console.error('Error indexing video:', error);
        throw error;
    }
}

export { initializeIndex };
export default client;