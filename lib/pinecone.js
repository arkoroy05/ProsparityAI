import { Pinecone } from '@pinecone-database/pinecone';

let pineconeClient = null;

export const initPinecone = async () => {
  if (pineconeClient) return pineconeClient;
  
  try {
    const apiKey = process.env.PINECONE_API_KEY;
    const controllerHostUrl = process.env.PINECONE_CONTROLLER_HOST;
    
    if (!apiKey) {
      console.error('Missing Pinecone API key');
      return null;
    }

    if (!controllerHostUrl) {
      console.error('Missing Pinecone controller host URL');
      return null;
    }
    
    pineconeClient = new Pinecone({
      apiKey,
      controllerHostUrl,
    });
    
    return pineconeClient;
  } catch (error) {
    console.error('Error initializing Pinecone client:', error);
    return null;
  }
};

export const createIndex = async (indexName, dimension = 1536) => {
  const client = await initPinecone();
  if (!client) return { error: 'Pinecone client not initialized' };
  
  try {
    // Check if index already exists
    const indexList = await client.listIndexes();
    const indexExists = indexList.some(index => index.name === indexName);
    
    if (!indexExists) {
      await client.createIndex({
        name: indexName,
        dimension,
        metric: 'cosine',
      });
      console.log(`Created index: ${indexName}`);
    } else {
      console.log(`Index ${indexName} already exists`);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error creating Pinecone index:', error);
    return { error: error.message };
  }
};

export const upsertVectors = async (indexName, vectors) => {
  const client = await initPinecone();
  if (!client) return { error: 'Pinecone client not initialized' };
  
  try {
    const index = client.Index(indexName);
    await index.upsert(vectors);
    return { success: true, count: vectors.length };
  } catch (error) {
    console.error('Error upserting vectors:', error);
    return { error: error.message };
  }
};

export const queryVectors = async (indexName, queryVector, topK = 5) => {
  const client = await initPinecone();
  if (!client) return { error: 'Pinecone client not initialized' };
  
  try {
    const index = client.Index(indexName);
    const results = await index.query({
      vector: queryVector,
      topK,
      includeMetadata: true,
    });
    
    return { success: true, results: results.matches };
  } catch (error) {
    console.error('Error querying vectors:', error);
    return { error: error.message };
  }
}; 