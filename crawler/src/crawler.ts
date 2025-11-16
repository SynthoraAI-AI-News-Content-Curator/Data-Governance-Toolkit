import axios from 'axios';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import { logger } from './utils/logger';

export interface CrawledArticle {
  url: string;
  title: string;
  content: string;
  source: string;
  publishedAt?: Date;
}

export class ArticleCrawler {
  private maxRetries = 3;
  private retryDelay = 2000;

  async crawl(url: string, source: string): Promise<CrawledArticle[]> {
    logger.info(`Crawling: ${url}`);

    try {
      // Try static crawling first (faster)
      const articles = await this.staticCrawl(url, source);
      if (articles.length > 0) {
        logger.info(`Found ${articles.length} articles via static crawl`);
        return articles;
      }

      // Fallback to dynamic crawling
      logger.info('Falling back to dynamic crawl (Puppeteer)');
      return await this.dynamicCrawl(url, source);
    } catch (error: any) {
      logger.error(`Crawl failed for ${url}:`, error.message);
      return [];
    }
  }

  private async staticCrawl(url: string, source: string): Promise<CrawledArticle[]> {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'SynthoraAI/1.0 (Government Content Curator)',
        },
      });

      const $ = cheerio.load(response.data);
      return this.extractArticles($, url, source);
    } catch (error: any) {
      if (error.response?.status === 403 || error.code === 'ECONNRESET') {
        throw new Error('Static crawl blocked, need dynamic crawl');
      }
      throw error;
    }
  }

  private async dynamicCrawl(url: string, source: string): Promise<CrawledArticle[]> {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setUserAgent('SynthoraAI/1.0 (Government Content Curator)');

      await page.goto(url, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      const content = await page.content();
      const $ = cheerio.load(content);

      return this.extractArticles($, url, source);
    } finally {
      await browser.close();
    }
  }

  private extractArticles(
    $: cheerio.CheerioAPI,
    baseUrl: string,
    source: string
  ): CrawledArticle[] {
    const articles: CrawledArticle[] = [];

    // Common article selectors for government sites
    const selectors = [
      'article',
      '.article',
      '.post',
      '.news-item',
      '[class*="article"]',
      '[class*="post"]',
    ];

    selectors.forEach((selector) => {
      $(selector).each((_, element) => {
        try {
          const $article = $(element);

          // Extract title
          const title =
            $article.find('h1, h2, h3, .title, [class*="title"]').first().text().trim() ||
            $article.find('a').first().text().trim();

          // Extract link
          let link = $article.find('a').first().attr('href') || '';
          if (link && !link.startsWith('http')) {
            link = new URL(link, baseUrl).toString();
          }

          // Extract content
          const content =
            $article.find('p, .content, .summary, [class*="content"]')
              .map((_, el) => $(el).text().trim())
              .get()
              .join('\n\n') ||
            $article.text().trim();

          // Extract date
          const dateText = $article.find('time, .date, [class*="date"]').first().text();
          const publishedAt = dateText ? new Date(dateText) : undefined;

          if (title && content && content.length > 100) {
            articles.push({
              url: link || baseUrl,
              title,
              content,
              source,
              publishedAt,
            });
          }
        } catch (error) {
          logger.warn('Failed to extract article:', error);
        }
      });
    });

    return articles;
  }

  async crawlWithRetry(url: string, source: string): Promise<CrawledArticle[]> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.crawl(url, source);
      } catch (error: any) {
        logger.warn(`Attempt ${attempt}/${this.maxRetries} failed for ${url}`);

        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * attempt;
          logger.info(`Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          logger.error(`All ${this.maxRetries} attempts failed for ${url}`);
          throw error;
        }
      }
    }

    return [];
  }
}

// Standalone function
export async function crawlArticles(url: string, source: string): Promise<CrawledArticle[]> {
  const crawler = new ArticleCrawler();
  return crawler.crawlWithRetry(url, source);
}
