/**
 * Admin API client for YeWaledoch backend
 */

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) {
    localStorage.setItem('admin_token', token);
  } else {
    localStorage.removeItem('admin_token');
  }
}

export function getAccessToken(): string | null {
  if (!accessToken) {
    accessToken = localStorage.getItem('admin_token');
  }
  return accessToken;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAccessToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      setAccessToken(null);
      window.location.reload();
    }
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DashboardStats {
  total_users: number;
  total_posts: number;
  total_comments: number;
  new_users_today: number;
  posts_today: number;
  comments_today: number;
  active_users_24h: number;
  pending_drafts: number;
  pending_reports: number;
}

export interface ScrapedDraft {
  id: string;
  reddit_post_id: string;
  reddit_url: string | null;
  subreddit: string | null;
  original_title: string | null;
  original_body: string | null;
  original_upvotes: number | null;
  original_comments: number | null;
  translated_title: string | null;
  translated_body: string | null;
  status: string;
  category: string | null;
  notes: string | null;
  scraped_at: string;
  reviewed_at: string | null;
  published_post_id: string | null;
}

export interface DraftListResponse {
  items: ScrapedDraft[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

export interface AdminPost {
  id: string;
  title: string;
  body: string;
  post_type: string;
  category: string;
  status: string;
  is_pinned: boolean;
  is_featured: boolean;
  like_count: number;
  comment_count: number;
  view_count: number;
  created_at: string;
  published_at: string | null;
  author_id: string;
  author_name: string | null;
}

export interface AdminPostListResponse {
  items: AdminPost[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

export interface AdminUser {
  id: string;
  telegram_id: number;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  role: string;
  is_banned: boolean;
  ban_reason: string | null;
  post_count: number;
  comment_count: number;
  reputation: number;
  created_at: string;
}

export interface AdminUserListResponse {
  items: AdminUser[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

export interface AdminReport {
  id: string;
  reporter_id: string;
  reporter_name: string | null;
  post_id: string | null;
  comment_id: string | null;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  resolved_at: string | null;
}

export interface AdminReportListResponse {
  items: AdminReport[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

export interface User {
  id: string;
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string;
  created_at: string;
}

// ─── API Modules ──────────────────────────────────────────────────────────────

export const authApi = {
  telegram: (initData: string) =>
    request<{ access_token: string; user: User }>('/auth/telegram', {
      method: 'POST',
      body: JSON.stringify({ init_data: initData }),
    }),

  me: () => request<User>('/users/me'),
};

export const adminApi = {
  dashboard: () => request<DashboardStats>('/admin/dashboard'),

  // Draft Queue
  drafts: (params: { status?: string; page?: number; per_page?: number } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.status) searchParams.set('status', params.status);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.per_page) searchParams.set('per_page', String(params.per_page));
    const query = searchParams.toString();
    return request<DraftListResponse>(`/admin/drafts${query ? `?${query}` : ''}`);
  },

  getDraft: (draftId: string) =>
    request<ScrapedDraft>(`/admin/drafts/${draftId}`),

  updateDraft: (draftId: string, data: {
    translated_title?: string;
    translated_body?: string;
    category?: string;
    notes?: string;
  }) =>
    request<ScrapedDraft>(`/admin/drafts/${draftId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  publishDraft: (draftId: string) =>
    request<ScrapedDraft>(`/admin/drafts/${draftId}/publish`, {
      method: 'POST',
    }),

  discardDraft: (draftId: string) =>
    request<{ message: string }>(`/admin/drafts/${draftId}`, {
      method: 'DELETE',
    }),

  // Content Management
  posts: (params: {
    page?: number;
    per_page?: number;
    status?: string;
    post_type?: string;
    search?: string;
  } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.per_page) searchParams.set('per_page', String(params.per_page));
    if (params.status) searchParams.set('status', params.status);
    if (params.post_type) searchParams.set('post_type', params.post_type);
    if (params.search) searchParams.set('search', params.search);
    const query = searchParams.toString();
    return request<AdminPostListResponse>(`/admin/posts${query ? `?${query}` : ''}`);
  },

  updatePost: (postId: string, data: {
    title?: string;
    body?: string;
    category?: string;
    status?: string;
    is_pinned?: boolean;
    is_featured?: boolean;
  }) =>
    request<AdminPost>(`/admin/posts/${postId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deletePost: (postId: string) =>
    request<{ message: string }>(`/admin/posts/${postId}`, {
      method: 'DELETE',
    }),

  // User Management
  users: (params: {
    page?: number;
    per_page?: number;
    role?: string;
    search?: string;
  } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.per_page) searchParams.set('per_page', String(params.per_page));
    if (params.role) searchParams.set('role', params.role);
    if (params.search) searchParams.set('search', params.search);
    const query = searchParams.toString();
    return request<AdminUserListResponse>(`/admin/users${query ? `?${query}` : ''}`);
  },

  updateUserRole: (userId: string, role: string) =>
    request<{ message: string; role: string }>(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  banUser: (userId: string, reason: string) =>
    request<{ message: string }>(`/admin/users/${userId}/ban`, {
      method: 'POST',
      body: JSON.stringify({ ban_reason: reason }),
    }),

  unbanUser: (userId: string) =>
    request<{ message: string }>(`/admin/users/${userId}/unban`, {
      method: 'POST',
    }),

  // Reports
  reports: (params: {
    page?: number;
    per_page?: number;
    status?: string;
  } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.per_page) searchParams.set('per_page', String(params.per_page));
    if (params.status) searchParams.set('status', params.status);
    const query = searchParams.toString();
    return request<AdminReportListResponse>(`/admin/reports${query ? `?${query}` : ''}`);
  },

  resolveReport: (reportId: string, action: 'dismiss' | 'remove' | 'ban') =>
    request<{ message: string }>(`/admin/reports/${reportId}/action`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    }),

  // Scraper
  triggerScraper: () =>
    request<{ message: string }>('/admin/scraper/run', {
      method: 'POST',
    }),

  // Broadcast
  broadcast: (title: string, body: string) =>
    request<{ message: string }>('/admin/broadcast', {
      method: 'POST',
      body: JSON.stringify({ title, body }),
    }),
};
