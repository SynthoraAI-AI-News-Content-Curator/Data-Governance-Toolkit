import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../index';
import Article from '../models/Article';
import User from '../models/User';

let mongoServer: MongoMemoryServer;
let authToken: string;
let testArticleId: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Create test user and get token
  const response = await request(app)
    .post('/api/auth/register')
    .send({
      email: 'test@example.com',
      password: 'Test123!@#',
      name: 'Test User',
    });

  authToken = response.body.data.token;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Article.deleteMany({});
});

describe('GET /api/articles', () => {
  it('should return paginated articles', async () => {
    // Create test articles
    await Article.create([
      {
        title: 'Test Article 1',
        content: 'Content 1',
        url: 'https://example.com/1',
        source: 'test',
        topics: ['Politics'],
      },
      {
        title: 'Test Article 2',
        content: 'Content 2',
        url: 'https://example.com/2',
        source: 'test',
        topics: ['Economy'],
      },
    ]);

    const response = await request(app)
      .get('/api/articles?page=1&limit=10')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.pagination).toMatchObject({
      page: 1,
      limit: 10,
      total: 2,
    });
  });

  it('should filter articles by source', async () => {
    await Article.create([
      {
        title: 'Article 1',
        content: 'Content',
        url: 'https://example.com/1',
        source: 'source1',
        topics: ['Politics'],
      },
      {
        title: 'Article 2',
        content: 'Content',
        url: 'https://example.com/2',
        source: 'source2',
        topics: ['Politics'],
      },
    ]);

    const response = await request(app)
      .get('/api/articles?source=source1')
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].source).toBe('source1');
  });
});

describe('GET /api/articles/:id', () => {
  it('should return article by id', async () => {
    const article = await Article.create({
      title: 'Test Article',
      content: 'Test Content',
      url: 'https://example.com/test',
      source: 'test',
      topics: ['Politics'],
    });

    const response = await request(app)
      .get(`/api/articles/${article._id}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.title).toBe('Test Article');
  });

  it('should return 404 for non-existent article', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    await request(app)
      .get(`/api/articles/${fakeId}`)
      .expect(404);
  });
});

describe('POST /api/articles/:id/favorite', () => {
  it('should toggle favorite status', async () => {
    const article = await Article.create({
      title: 'Test Article',
      content: 'Test Content',
      url: 'https://example.com/test',
      source: 'test',
      topics: ['Politics'],
    });

    const response = await request(app)
      .post(`/api/articles/${article._id}/favorite`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.isFavorited).toBe(true);

    // Toggle again
    const response2 = await request(app)
      .post(`/api/articles/${article._id}/favorite`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response2.body.data.isFavorited).toBe(false);
  });

  it('should require authentication', async () => {
    const article = await Article.create({
      title: 'Test Article',
      content: 'Test Content',
      url: 'https://example.com/test',
      source: 'test',
      topics: ['Politics'],
    });

    await request(app)
      .post(`/api/articles/${article._id}/favorite`)
      .expect(401);
  });
});

describe('POST /api/articles/:id/rate', () => {
  it('should rate an article', async () => {
    const article = await Article.create({
      title: 'Test Article',
      content: 'Test Content',
      url: 'https://example.com/test',
      source: 'test',
      topics: ['Politics'],
    });

    const response = await request(app)
      .post(`/api/articles/${article._id}/rate`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ rating: 5 })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.average).toBe(5);
    expect(response.body.data.count).toBe(1);
  });

  it('should validate rating value', async () => {
    const article = await Article.create({
      title: 'Test Article',
      content: 'Test Content',
      url: 'https://example.com/test',
      source: 'test',
      topics: ['Politics'],
    });

    await request(app)
      .post(`/api/articles/${article._id}/rate`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ rating: 6 })
      .expect(400);
  });
});
