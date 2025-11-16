import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger';
import { ISentiment, IBiasAnalysis } from '../models/Article';

export class AIService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GOOGLE_AI_API_KEY || '';
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
  }

  async summarize(content: string): Promise<string> {
    try {
      const prompt = `
        ${process.env.AI_INSTRUCTIONS || 'Summarize the following article concisely and naturally'}

        Article content:
        ${content.substring(0, 10000)} // Limit to first 10k chars

        Provide a concise 150-200 word summary focusing on:
        - Main points and key takeaways
        - Important facts and figures
        - Implications for government officials

        Summary:
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const summary = response.text();

      logger.info('Article summarized successfully');
      return summary;
    } catch (error: any) {
      logger.error('Error generating summary:', error);
      throw new Error(`Failed to generate summary: ${error.message}`);
    }
  }

  async analyzeBias(content: string): Promise<IBiasAnalysis> {
    try {
      const prompt = `
        Analyze the following article for bias:
        ${content.substring(0, 10000)}

        Provide:
        1. Bias score (0-100, where 0 = no bias, 100 = extreme bias)
        2. Specific bias indicators
        3. Overall assessment
        4. Recommendations for more balanced coverage

        Return as JSON with this exact structure:
        {
          "score": number,
          "indicators": ["indicator1", "indicator2", ...],
          "overallAssessment": "detailed assessment text",
          "recommendations": ["recommendation1", "recommendation2", ...]
        }
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid JSON response from AI');
      }

      const biasAnalysis = JSON.parse(jsonMatch[0]);

      logger.info('Bias analysis completed successfully');
      return biasAnalysis;
    } catch (error: any) {
      logger.error('Error analyzing bias:', error);
      // Return default analysis on error
      return {
        score: 50,
        indicators: ['Unable to analyze'],
        overallAssessment: 'Bias analysis temporarily unavailable',
        recommendations: [],
      };
    }
  }

  async analyzeSentiment(content: string): Promise<ISentiment> {
    try {
      const prompt = `
        Analyze the sentiment and characteristics of this article:
        ${content.substring(0, 10000)}

        Provide scores (0-100) for:
        1. Tone: positive, negative, or neutral
        2. Objectivity: 0 (very biased) to 100 (completely objective)
        3. Urgency: 0 (not urgent) to 100 (extremely urgent)
        4. Controversy: 0 (uncontroversial) to 100 (highly controversial)

        Return as JSON with this exact structure:
        {
          "tone": "positive|negative|neutral",
          "objectivity": number,
          "urgency": number,
          "controversy": number
        }
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid JSON response from AI');
      }

      const sentiment = JSON.parse(jsonMatch[0]);

      logger.info('Sentiment analysis completed successfully');
      return sentiment;
    } catch (error: any) {
      logger.error('Error analyzing sentiment:', error);
      // Return default sentiment on error
      return {
        tone: 'neutral',
        objectivity: 75,
        urgency: 50,
        controversy: 30,
      };
    }
  }

  async answerQuestion(
    content: string,
    title: string,
    question: string
  ): Promise<{ answer: string; confidence: number; sources: any[] }> {
    try {
      const prompt = `
        You are ArticleIQ, an AI assistant specialized in answering questions about articles.

        Article Title: ${title}
        Article Content: ${content.substring(0, 10000)}

        User Question: ${question}

        Provide a detailed, accurate answer based ONLY on the article content.
        If the answer is not in the article, say so clearly.

        Return as JSON with this exact structure:
        {
          "answer": "detailed answer text",
          "confidence": number (0-100),
          "sources": [
            {
              "text": "relevant excerpt from article",
              "position": character position in content
            }
          ]
        }
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid JSON response from AI');
      }

      const qaResult = JSON.parse(jsonMatch[0]);

      logger.info('Question answered successfully');
      return qaResult;
    } catch (error: any) {
      logger.error('Error answering question:', error);
      return {
        answer: 'Unable to answer the question at this time.',
        confidence: 0,
        sources: [],
      };
    }
  }

  async classifyTopics(content: string): Promise<string[]> {
    try {
      const topics = [
        'Politics & Government',
        'International Relations',
        'Economy & Finance',
        'Healthcare',
        'Education',
        'Technology',
        'Environment & Climate',
        'Defense & Security',
        'Justice & Law',
        'Social Issues',
        'Infrastructure',
        'Energy',
        'Agriculture',
        'Science & Research',
        'Culture & Arts',
      ];

      const prompt = `
        Classify the following article into 1-3 most relevant topics from this list:
        ${topics.join(', ')}

        Article content:
        ${content.substring(0, 5000)}

        Return as JSON array of topic names:
        ["Topic1", "Topic2", "Topic3"]
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Invalid JSON response from AI');
      }

      const classifiedTopics = JSON.parse(jsonMatch[0]);

      logger.info('Topics classified successfully');
      return classifiedTopics.slice(0, 3); // Max 3 topics
    } catch (error: any) {
      logger.error('Error classifying topics:', error);
      return ['General'];
    }
  }
}
