import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger';

export class PineconeService {
  private pinecone: Pinecone;
  private index: any;
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.PINECONE_API_KEY || '';
    const environment = process.env.PINECONE_ENVIRONMENT || 'us-west1-gcp';
    const indexName = process.env.PINECONE_INDEX_NAME || 'synthoraai-articles';

    this.pinecone = new Pinecone({
      apiKey,
      environment,
    });

    this.index = this.pinecone.Index(indexName);

    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');
  }

  async generateEmbeddings(text: string): Promise<number[]> {
    try {
      // Use Google's embedding model
      const model = this.genAI.getGenerativeModel({ model: 'embedding-001' });

      const result = await model.embedContent(text.substring(0, 10000));
      const embeddings = result.embedding.values;

      logger.info('Embeddings generated successfully');
      return embeddings;
    } catch (error: any) {
      logger.error('Error generating embeddings:', error);
      // Return zero vector as fallback
      return new Array(1536).fill(0);
    }
  }

  async upsert(
    id: string,
    embeddings: number[],
    metadata: { title: string; source: string; topics: string }
  ): Promise<void> {
    try {
      await this.index.upsert([
        {
          id,
          values: embeddings,
          metadata,
        },
      ]);

      logger.info(`Vector stored in Pinecone: ${id}`);
    } catch (error: any) {
      logger.error('Error upserting to Pinecone:', error);
      // Don't throw - vector search is not critical
    }
  }

  async findSimilar(embeddings: number[], limit: number = 6): Promise<string[]> {
    try {
      const queryResponse = await this.index.query({
        vector: embeddings,
        topK: limit,
        includeMetadata: false,
      });

      const ids = queryResponse.matches?.map((match: any) => match.id) || [];

      logger.info(`Found ${ids.length} similar articles`);
      return ids;
    } catch (error: any) {
      logger.error('Error querying Pinecone:', error);
      return [];
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.index.deleteOne(id);
      logger.info(`Vector deleted from Pinecone: ${id}`);
    } catch (error: any) {
      logger.error('Error deleting from Pinecone:', error);
      // Don't throw
    }
  }
}
