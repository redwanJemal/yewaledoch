/**
 * API client for YeWaledoch backend
 */

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) {
    localStorage.setItem('access_token', token);
  } else {
    localStorage.removeItem('access_token');
  }
}

export function getAccessToken(): string | null {
  if (!accessToken) {
    accessToken = localStorage.getItem('access_token');
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
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  photo_url: string | null;
  phone: string | null;
  phone_verified: boolean;
  role: string;
  parenting_role: string | null;
  children_data: ChildData[];
  city: string | null;
  reputation: number;
  post_count: number;
  comment_count: number;
  expert_specialty: string | null;
  expert_bio: string | null;
  expert_verified: boolean;
  language: string;
  settings: Record<string, unknown>;
  created_at: string;
}

export interface ChildData {
  name: string;
  age?: number;
  gender?: string;
}

export interface UserPublic {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  photo_url: string | null;
  role: string;
  parenting_role: string | null;
  city: string | null;
  reputation: number;
  post_count: number;
  comment_count: number;
  expert_specialty: string | null;
  expert_bio: string | null;
  expert_verified: boolean;
  created_at: string;
}

export interface AuthorInfo {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  photo_url: string | null;
  role: string;
  expert_verified: boolean;
  expert_specialty: string | null;
  parenting_role: string | null;
}

export interface Post {
  id: string;
  title: string;
  body: string;
  post_type: PostType;
  category: string;
  age_group: string | null;
  tags: string[];
  language: string;
  images: string[];
  is_anonymous: boolean;
  is_pinned: boolean;
  is_featured: boolean;
  discussion_prompt: string | null;
  source_url: string | null;
  like_count: number;
  comment_count: number;
  save_count: number;
  view_count: number;
  status: string;
  published_at: string | null;
  created_at: string;
  author: AuthorInfo | null;
  is_liked: boolean;
  is_saved: boolean;
}

export type PostType = 'question' | 'tip' | 'story' | 'discussion' | 'expert_answer';

export interface PostListResponse {
  items: Post[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

export interface PostFeedParams {
  page?: number;
  per_page?: number;
  category?: string;
  post_type?: PostType;
  age_group?: string;
  search?: string;
  sort?: 'latest' | 'popular' | 'discussed';
  language?: string;
}

export interface PostCreateRequest {
  title: string;
  body: string;
  post_type: PostType;
  category: string;
  age_group?: string;
  tags?: string[];
  images?: string[];
  is_anonymous?: boolean;
  discussion_prompt?: string;
}

export interface PostUpdateRequest {
  title?: string;
  body?: string;
  category?: string;
  age_group?: string;
  tags?: string[];
  images?: string[];
  is_anonymous?: boolean;
  discussion_prompt?: string;
}

export interface Comment {
  id: string;
  post_id: string;
  parent_id: string | null;
  body: string;
  is_anonymous: boolean;
  is_expert_answer: boolean;
  like_count: number;
  status: string;
  created_at: string;
  updated_at: string;
  author: AuthorInfo | null;
  is_liked: boolean;
  replies: Comment[];
}

export interface CommentListResponse {
  items: Comment[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

export interface CommentCreateRequest {
  body: string;
  parent_id?: string;
  is_anonymous?: boolean;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  unread_count: number;
  has_more: boolean;
}

export interface Child {
  id: string;
  name: string;
  date_of_birth: string;
  gender: 'M' | 'F' | null;
  photo_url: string | null;
  created_at: string;
}

export interface ChildCreateRequest {
  name: string;
  date_of_birth: string;
  gender?: 'M' | 'F';
}

export interface ChildUpdateRequest {
  name?: string;
  date_of_birth?: string;
  gender?: 'M' | 'F';
}

export interface Vaccination {
  id: string;
  vaccine_name: string;
  dose_number: number;
  scheduled_date: string | null;
  administered_date: string | null;
  facility: string | null;
  status: 'pending' | 'completed';
  notes: string | null;
}

export interface VaccinationLogRequest {
  vaccine_name: string;
  dose_number?: number;
  administered_date: string;
  facility?: string;
  notes?: string;
}

export interface Milestone {
  id: string;
  milestone_type: string;
  completed_at: string | null;
  notes: string | null;
  photo_url: string | null;
}

export interface MilestoneLogRequest {
  milestone_type: string;
  completed_at?: string;
  notes?: string;
  photo_url?: string;
}

export interface CategoryInfo {
  slug: string;
  name_am: string;
  name_en: string;
}

export interface VaccineScheduleGroup {
  age: string;
  age_weeks: number;
  vaccines: {
    name: string;
    name_am: string;
    dose: number;
    description: string;
    description_am: string;
  }[];
}

export interface VaccineInfo {
  name: string;
  name_am: string;
  doses: number;
  schedule_weeks: number[];
}

export function transformVaccineData(groups: VaccineScheduleGroup[]): VaccineInfo[] {
  const vaccineMap = new Map<string, { name_am: string; weeks: number[] }>();
  for (const group of groups) {
    for (const v of group.vaccines) {
      const existing = vaccineMap.get(v.name);
      if (existing) {
        existing.weeks.push(group.age_weeks);
      } else {
        vaccineMap.set(v.name, { name_am: v.name_am, weeks: [group.age_weeks] });
      }
    }
  }
  return Array.from(vaccineMap.entries()).map(([name, data]) => ({
    name,
    name_am: data.name_am,
    doses: data.weeks.length,
    schedule_weeks: data.weeks,
  }));
}

export interface MilestoneInfo {
  type: string;
  name_am: string;
  name_en: string;
  age_months: number;
  category: string;
}

// Admin types
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

export interface LLMSettings {
  id: string;
  provider: string;
  api_key_set: boolean;
  model: string;
  base_url: string | null;
  enabled: boolean;
  updated_at: string;
}

export interface Report {
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

export interface AdminListResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

// ─── API Modules ──────────────────────────────────────────────────────────────

export const authApi = {
  telegram: (initData: string) =>
    request<{ access_token: string; user: User }>('/auth/telegram', {
      method: 'POST',
      body: JSON.stringify({ init_data: initData }),
    }),
};

export const usersApi = {
  me: () => request<User>('/users/me'),

  updateProfile: (data: {
    first_name?: string;
    last_name?: string;
    city?: string;
    parenting_role?: string;
    language?: string;
    children_data?: ChildData[];
    phone?: string;
  }) =>
    request<User>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getProfile: (userId: string) =>
    request<UserPublic>(`/users/${userId}`),
};

export const postsApi = {
  feed: (params: PostFeedParams = {}) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.per_page) searchParams.set('per_page', String(params.per_page));
    if (params.category) searchParams.set('category', params.category);
    if (params.post_type) searchParams.set('post_type', params.post_type);
    if (params.age_group) searchParams.set('age_group', params.age_group);
    if (params.search) searchParams.set('search', params.search);
    if (params.sort) searchParams.set('sort', params.sort);
    if (params.language) searchParams.set('language', params.language);
    const query = searchParams.toString();
    return request<PostListResponse>(`/posts${query ? `?${query}` : ''}`);
  },

  detail: (postId: string) => request<Post>(`/posts/${postId}`),

  create: (data: PostCreateRequest) =>
    request<Post>('/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (postId: string, data: PostUpdateRequest) =>
    request<Post>(`/posts/${postId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (postId: string) =>
    request<{ message: string }>(`/posts/${postId}`, {
      method: 'DELETE',
    }),

  like: (postId: string) =>
    request<{ liked: boolean; like_count: number }>(`/posts/${postId}/like`, {
      method: 'POST',
    }),

  save: (postId: string) =>
    request<{ saved: boolean }>(`/posts/${postId}/save`, {
      method: 'POST',
    }),

  report: (postId: string, reason: string, details?: string) =>
    request<{ message: string }>(`/posts/${postId}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason, details }),
    }),

  saved: (params: { page?: number; per_page?: number } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.per_page) searchParams.set('per_page', String(params.per_page));
    const query = searchParams.toString();
    return request<PostListResponse>(`/posts/saved${query ? `?${query}` : ''}`);
  },

  mine: (params: { page?: number; per_page?: number } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.per_page) searchParams.set('per_page', String(params.per_page));
    const query = searchParams.toString();
    return request<PostListResponse>(`/posts/mine${query ? `?${query}` : ''}`);
  },
};

export const commentsApi = {
  list: (postId: string, params: { page?: number; per_page?: number } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.per_page) searchParams.set('per_page', String(params.per_page));
    const query = searchParams.toString();
    return request<CommentListResponse>(`/posts/${postId}/comments${query ? `?${query}` : ''}`);
  },

  create: (postId: string, data: CommentCreateRequest) =>
    request<Comment>(`/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (commentId: string, body: string) =>
    request<Comment>(`/comments/${commentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ body }),
    }),

  delete: (commentId: string) =>
    request<{ message: string }>(`/comments/${commentId}`, {
      method: 'DELETE',
    }),

  like: (commentId: string) =>
    request<{ liked: boolean; like_count: number }>(`/comments/${commentId}/like`, {
      method: 'POST',
    }),

  report: (commentId: string, reason: string, details?: string) =>
    request<{ message: string }>(`/comments/${commentId}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason, details }),
    }),
};

export const notificationsApi = {
  list: (params: { page?: number; per_page?: number } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.per_page) searchParams.set('per_page', String(params.per_page));
    const query = searchParams.toString();
    return request<NotificationListResponse>(`/notifications${query ? `?${query}` : ''}`);
  },

  markRead: (ids: string[]) =>
    request<{ message: string }>('/notifications/read', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),

  markAllRead: () =>
    request<{ message: string }>('/notifications/read-all', {
      method: 'POST',
    }),
};

export const childrenApi = {
  list: () => request<Child[]>('/children'),

  create: (data: ChildCreateRequest) =>
    request<Child>('/children', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (childId: string, data: ChildUpdateRequest) =>
    request<Child>(`/children/${childId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (childId: string) =>
    request<void>(`/children/${childId}`, {
      method: 'DELETE',
    }),

  vaccinations: (childId: string) =>
    request<Vaccination[]>(`/children/${childId}/vaccinations`),

  logVaccination: (childId: string, data: VaccinationLogRequest) =>
    request<Vaccination>(`/children/${childId}/vaccinations`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  milestones: (childId: string) =>
    request<Milestone[]>(`/children/${childId}/milestones`),

  logMilestone: (childId: string, data: MilestoneLogRequest) =>
    request<Milestone>(`/children/${childId}/milestones`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const resourcesApi = {
  vaccines: () => request<VaccineScheduleGroup[]>('/resources/vaccines'),
  milestones: () => request<MilestoneInfo[]>('/resources/milestones'),
  categories: () => request<CategoryInfo[]>('/resources/categories'),
};

export const adminApi = {
  dashboard: () => request<DashboardStats>('/admin/dashboard'),

  drafts: (params: { status?: string; page?: number; per_page?: number } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.status) searchParams.set('status', params.status);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.per_page) searchParams.set('per_page', String(params.per_page));
    const query = searchParams.toString();
    return request<{ items: ScrapedDraft[]; total: number; has_more: boolean }>(
      `/admin/drafts${query ? `?${query}` : ''}`
    );
  },

  getDraft: (draftId: string) => request<ScrapedDraft>(`/admin/drafts/${draftId}`),

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

  translateDraft: (draftId: string) =>
    request<ScrapedDraft>(`/admin/drafts/${draftId}/translate`, {
      method: 'POST',
    }),

  publishDraft: (draftId: string) =>
    request<Post>(`/admin/drafts/${draftId}/publish`, {
      method: 'POST',
    }),

  discardDraft: (draftId: string) =>
    request<{ message: string }>(`/admin/drafts/${draftId}`, {
      method: 'DELETE',
    }),

  posts: (params: { page?: number; per_page?: number; status?: string; search?: string } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.per_page) searchParams.set('per_page', String(params.per_page));
    if (params.status) searchParams.set('status', params.status);
    if (params.search) searchParams.set('search', params.search);
    const query = searchParams.toString();
    return request<AdminListResponse<AdminPost>>(`/admin/posts${query ? `?${query}` : ''}`);
  },

  deletePost: (postId: string) =>
    request<{ message: string }>(`/admin/posts/${postId}`, { method: 'DELETE' }),

  users: (params: { page?: number; per_page?: number; role?: string; search?: string } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.per_page) searchParams.set('per_page', String(params.per_page));
    if (params.role) searchParams.set('role', params.role);
    if (params.search) searchParams.set('search', params.search);
    const query = searchParams.toString();
    return request<AdminListResponse<AdminUser>>(
      `/admin/users${query ? `?${query}` : ''}`
    );
  },

  updateUserRole: (userId: string, role: string) =>
    request<User>(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  banUser: (userId: string, reason: string) =>
    request<{ message: string; is_banned: boolean }>(`/admin/users/${userId}/ban`, {
      method: 'POST',
      body: JSON.stringify({ ban_reason: reason }),
    }),

  unbanUser: (userId: string) =>
    request<User>(`/admin/users/${userId}/unban`, {
      method: 'POST',
    }),

  reports: (params: { page?: number; per_page?: number; status?: string } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.per_page) searchParams.set('per_page', String(params.per_page));
    if (params.status) searchParams.set('status', params.status);
    const query = searchParams.toString();
    return request<{ items: Report[]; total: number; has_more: boolean }>(
      `/admin/reports${query ? `?${query}` : ''}`
    );
  },

  resolveReport: (reportId: string, action: 'dismiss' | 'remove' | 'ban') =>
    request<{ message: string }>(`/admin/reports/${reportId}/action`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    }),

  triggerScraper: () =>
    request<{ message: string }>('/admin/scraper/run', { method: 'POST' }),

  getLLMSettings: () =>
    request<LLMSettings>('/admin/settings/llm'),

  saveLLMSettings: (data: {
    provider: string;
    api_key?: string | null;
    model: string;
    base_url?: string | null;
    enabled: boolean;
  }) =>
    request<LLMSettings>('/admin/settings/llm', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  testLLMSettings: () =>
    request<{ ok: boolean; provider: string; model: string }>('/admin/settings/llm/test', {
      method: 'POST',
    }),
};
