import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_URL}/api`,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // Send cookies
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response.data,
      (error) => {
        if (error.response?.status === 401) {
          this.clearToken();
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  }

  private setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('token', token);
  }

  private clearToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('token');
  }

  // Articles
  async getArticles(params?: {
    page?: number;
    limit?: number;
    source?: string;
    topic?: string;
    sort?: string;
    order?: 'asc' | 'desc';
  }) {
    return this.client.get('/articles', { params });
  }

  async getArticle(id: string) {
    return this.client.get(`/articles/${id}`);
  }

  async createArticle(data: {
    title: string;
    content: string;
    url: string;
    source: string;
    topics: string[];
  }) {
    return this.client.post('/articles', data);
  }

  async updateArticle(id: string, data: Partial<{
    title: string;
    content: string;
    topics: string[];
  }>) {
    return this.client.put(`/articles/${id}`, data);
  }

  async deleteArticle(id: string) {
    return this.client.delete(`/articles/${id}`);
  }

  async toggleFavorite(id: string) {
    return this.client.post(`/articles/${id}/favorite`);
  }

  async rateArticle(id: string, rating: number) {
    return this.client.post(`/articles/${id}/rate`, { rating });
  }

  async addComment(id: string, content: string) {
    return this.client.post(`/articles/${id}/comment`, { content });
  }

  async upvoteComment(articleId: string, commentId: string) {
    return this.client.post(`/articles/${articleId}/comment/${commentId}/upvote`);
  }

  async getRelatedArticles(id: string, limit = 6) {
    return this.client.get(`/articles/${id}/related`, { params: { limit } });
  }

  async getBiasAnalysis(id: string) {
    return this.client.get(`/articles/${id}/bias`);
  }

  async askQuestion(id: string, question: string) {
    return this.client.post(`/articles/${id}/qa`, { question });
  }

  // Auth
  async register(data: { email: string; password: string; name: string }) {
    const response: any = await this.client.post('/auth/register', data);
    if (response.data?.token) {
      this.setToken(response.data.token);
    }
    return response;
  }

  async login(email: string, password: string) {
    const response: any = await this.client.post('/auth/login', { email, password });
    if (response.data?.token) {
      this.setToken(response.data.token);
    }
    return response;
  }

  async logout() {
    await this.client.post('/auth/logout');
    this.clearToken();
  }

  async getMe() {
    return this.client.get('/auth/me');
  }

  async updatePassword(currentPassword: string, newPassword: string) {
    return this.client.put('/auth/password', { currentPassword, newPassword });
  }

  // Users
  async getUser(id: string) {
    return this.client.get(`/users/${id}`);
  }

  async updateUser(id: string, data: any) {
    return this.client.put(`/users/${id}`, data);
  }

  async deleteUser(id: string) {
    return this.client.delete(`/users/${id}`);
  }

  async getFavorites() {
    return this.client.get('/users/favorites');
  }

  // Newsletter
  async subscribeNewsletter(email: string) {
    return this.client.post('/newsletter/subscribe', { email });
  }

  async unsubscribeNewsletter(email: string) {
    return this.client.post('/newsletter/unsubscribe', { email });
  }
}

export const api = new APIClient();
export default api;
