import { Client } from '@elastic/elasticsearch';

// Configuration options
const ELASTICSEARCH_CLOUD_URL = 'https://my-elasticsearch-project-e72e69.es.ap-southeast-1.aws.elastic.cloud:443';
const ELASTICSEARCH_API_KEY = 'NGdrSXlwWUJJeGNubFZJam1veGI6UmNrcmFpVHdvVllhV2kzaGdGb0NSdw==';
const INDEX_NAME = 'streamgo-1';

// Create client with better error handling and retry options
const client = new Client({
  node: ELASTICSEARCH_CLOUD_URL,
  auth: {
    apiKey: ELASTICSEARCH_API_KEY
  },
  maxRetries: 5,
  requestTimeout: 30000,
  ssl: {
    rejectUnauthorized: true
  }
});

// Test connection and initialize index
async function initializeIndex() {
  try {
    // Check if index exists
    const indexExists = await client.indices.exists({
      index: INDEX_NAME
    });

    if (!indexExists) {
      await client.indices.create({
        index: INDEX_NAME,
        body: {
          settings: {
            analysis: {
              analyzer: {
                autocomplete_analyzer: {
                  tokenizer: "autocomplete",
                  filter: ["lowercase"]
                },
                autocomplete_search_analyzer: {
                  tokenizer: "lowercase"
                }
              },
              tokenizer: {
                autocomplete: {
                  type: "edge_ngram",
                  min_gram: 2,
                  max_gram: 10,
                  token_chars: ["letter", "digit"]
                }
              }
            }
          },
          mappings: {
            properties: {
              id: { type: 'keyword' },
              text: {
                type: 'text',
                analyzer: 'autocomplete_analyzer',
                search_analyzer: 'autocomplete_search_analyzer',
                fields: {
                  keyword: {
                    type: "keyword",
                    ignore_above: 256
                  },
                  stemmed: { 
                    type: 'text',
                    analyzer: 'english' // Add stemmed version for better matching
                }
                }
              },
              title: {
                type: 'text',
                analyzer: 'autocomplete_analyzer',
                search_analyzer: 'autocomplete_search_analyzer',
                fields: {
                keyword: { type: "keyword", ignore_above: 256 },
                stemmed: { type: 'text', analyzer: 'english' }
            }
              },
              description: { type: 'text' },
              url: { type: 'keyword' },
              author: { type: 'keyword' },
              createdAt: { type: 'date' }
            }
          }
        }
      });
      console.log(`Successfully created index: ${INDEX_NAME}`);
    } else {
      console.log(`Index ${INDEX_NAME} already exists`);
    }
    return true;
  } catch (error) {
    // Handle specific error for index already existing
    if (error.meta && error.meta.body && error.meta.body.error && 
        error.meta.body.error.type === 'resource_already_exists_exception') {
      console.log(`Index ${INDEX_NAME} already exists (caught from error)`);
      return true;
    }
    console.error('Error initializing Elasticsearch index:', error.message);
    return false;
  }
}

// Search documents with improved query and autocomplete
async function searchVideos(query, page = 1, limit = 12) {
    const from = (page - 1) * limit;
    
    try {
        const result = await client.search({
            index: INDEX_NAME,
            body: {
                from,
                size: limit,
                query: query ? {
                    bool: {
                    should: [
                        // Exact matches in title (highest boost)
                        {
                            match_phrase: {
                                "title": {
                                    query: query,
                                    boost: 5
                                }
                            }
                        },
                        // Exact matches in title (stemmed version)
                        {
                            match: {
                                "title.stemmed": {
                                    query: query,
                                    boost: 4
                                }
                            }
                        },
                        // Exact matches in text field
                        {
                            match_phrase: {
                                "text": {
                                    query: query,
                                    boost: 3
                                }
                            }
                        },
                        // Stemmed matches in text field
                        {
                            match: {
                                "text.stemmed": {
                                    query: query,
                                    boost: 2.5
                                }
                            }
                        },
                        // Prefix matches for autocomplete
                        {
                            match_phrase_prefix: {
                                "text": {
                                    query: query,
                                    boost: 2,
                                    max_expansions: 10
                                }
                            }
                        },
                        // Fuzzy matching for typo tolerance
                        {
                            match: {
                                "text": {
                                    query: query,
                                    fuzziness: 'AUTO',
                                    boost: 1.5
                                }
                            }
                        },
                        // Match in description
                        {
                            match: {
                                "description": {
                                    query: query,
                                    boost: 1
                                }
                            }
                        }
                    ],
                    minimum_should_match: 1
                }
            } : { match_all: {} },
        sort: [
          { _score: 'desc' },
          { createdAt: 'desc' }
        ],
        highlight: {
          fields: {
            text: { number_of_fragments: 2, fragment_size: 150 },
            title: { number_of_fragments: 1, fragment_size: 150 },
            description: { number_of_fragments: 2, fragment_size: 150 }
          }
        }  
      }
    });
    
    return {
      total: result.hits.total.value,
      documents: result.hits.hits.map(hit => ({
        id: hit._id,
        ...hit._source,
        score: hit._score,
        highlights: hit.highlight
      }))
    };
  } catch (error) {
    console.error('Error searching documents:', error);
    return { total: 0, documents: [] };
  }
}

// Index a document
async function indexVideo(document) {
  try {
    // Ensure we have all required fields
    const videoDoc = {
      ...document,
      // Make sure text field combines other fields for better search
      text: `${document.title} ${document.description || ''} ${document.author || ''}`,
      createdAt: document.createdAt || new Date()
    };
    
    const result = await client.index({
      index: INDEX_NAME,
      id: document.id, // Use provided ID if available
      document: videoDoc,
      refresh: true
    });
    console.log(`Document indexed with ID: ${result._id}`);
    return result._id;
  } catch (error) {
    console.error('Error indexing document:', error);
    throw error;
  }
}

// Get suggestions for autocomplete
async function getSuggestions(query, limit = 5) {
    if (!query || query.trim() === '') {
        return [];
    }
    
    try {
        const result = await client.search({
            index: INDEX_NAME,
            body: {
                size: 0,
                query: {
                    bool: {
                        should: [
                            {
                                match_phrase_prefix: {
                                    "title": {
                                        query,
                                        boost: 4,
                                        slop: 2
                                    }
                                }
                            },
                            {
                                match_phrase_prefix: {
                                    "text": {
                                        query,
                                        boost: 2
                                    }
                                }
                            }
                        ]
                    }
                },
                aggs: {
                    title_suggestions: {
                        terms: {
                            field: "title.keyword",
                            size: limit,
                            order: { _count: "desc" }
                        }
                    },
                    text_suggestions: {
                        terms: {
                            field: "text.keyword",
                            size: limit,
                            order: { _count: "desc" }
                        }
                    }
                }
            }
        });
        
        // Combine and deduplicate suggestions
        const titleSuggestions = result.aggregations.title_suggestions.buckets.map(b => b.key);
        const textSuggestions = result.aggregations.text_suggestions.buckets.map(b => b.key);
        
        const combined = [...new Set([...titleSuggestions, ...textSuggestions])];
        return combined.slice(0, limit);
    } catch (error) {
        console.error('Error getting suggestions:', error);
        return [];
    }
}

// Delete a document by ID
async function deleteDocument(id) {
  try {
    const result = await client.delete({
      index: INDEX_NAME,
      id: id,
      refresh: true
    });
    console.log(`Document deleted: ${result._id}`);
    return result;
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
}

// Bulk index videos (useful for initial import or reindexing)
async function bulkIndexVideos(videos) {
  if (!videos || videos.length === 0) {
    console.log('No videos to bulk index');
    return { success: true, indexed: 0 };
  }

  try {
    const operations = videos.flatMap(video => [
      { index: { _index: INDEX_NAME, _id: video.id } },
      {
        id: video.id,
        title: video.title,
        text: `${video.title} ${video.description || ''} ${video.author || ''}`,
        description: video.description || '',
        url: video.url,
        author: video.author || '',
        createdAt: video.createdAt || new Date()
      }
    ]);

    const result = await client.bulk({
      refresh: true,
      body: operations  // ✅ use `body` instead of `operations`
    });

    if (result.errors) {
      console.error('Errors during bulk indexing:', result.items.filter(item => item.index && item.index.error));
      return {
        success: false,
        indexed: result.items.filter(item => item.index && !item.index.error).length,
        errors: result.items.filter(item => item.index && item.index.error)
      };
    }

    console.log(`Successfully bulk indexed ${videos.length} videos`);
    return { success: true, indexed: videos.length };
  } catch (error) {
    console.error('Error bulk indexing documents:', error);
    throw error;
  }
}

// Sync database with Elasticsearch index
async function syncDatabaseToElasticsearch(prisma) {
  try {
    console.log('Starting database to Elasticsearch sync...');
    
    // Get all videos from the database
    const videos = await prisma.videoData.findMany();
    console.log(`Found ${videos.length} videos in database`);
    
    // Bulk index all videos
    const result = await bulkIndexVideos(videos);
    
    console.log(`Sync complete. Indexed ${result.indexed} videos`);
    return result;
  } catch (error) {
    console.error('Error syncing database to Elasticsearch:', error);
    throw error;
  }
}

export { 
  client, 
  initializeIndex, 
  searchVideos, 
  indexVideo, 
  getSuggestions,
  deleteDocument,
  bulkIndexVideos,
  syncDatabaseToElasticsearch
};