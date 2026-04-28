import api from './api';

export interface BlogImage {
  imageId: string;
  imageBase64: string;
  imageContentType: string;
  displayOrder: number;
}

export interface BlogComment {
  commentId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}

export interface BlogPostSummary {
  postId: string;
  title: string;
  summary?: string;
  category: string;
  published: boolean;
  likeCount: number;
  commentCount: number;
  coverImageBase64?: string;
  coverImageContentType?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BlogPostDetail extends BlogPostSummary {
  content?: string;
  likedByCurrentUser: boolean;
  images: BlogImage[];
  comments: BlogComment[];
}

export interface BlogPage {
  content: BlogPostSummary[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
}

const BlogService = {
  // Admin
  getAllPostsAdmin: async (page = 0, size = 20): Promise<BlogPage> => {
    const res = await api.get<BlogPage>(`/api/admin/blog/all?page=${page}&size=${size}`);
    return res.data;
  },

  getPostAdmin: async (postId: string): Promise<BlogPostDetail> => {
    const res = await api.get<BlogPostDetail>(`/api/admin/blog/${postId}`);
    return res.data;
  },

  createPost: async (formData: FormData): Promise<BlogPostDetail> => {
    const res = await api.post<BlogPostDetail>('/api/admin/blog', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  updatePost: async (postId: string, formData: FormData): Promise<BlogPostDetail> => {
    const res = await api.put<BlogPostDetail>(`/api/admin/blog/${postId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  togglePublish: async (postId: string): Promise<BlogPostDetail> => {
    const res = await api.put<BlogPostDetail>(`/api/admin/blog/${postId}/publish`);
    return res.data;
  },

  deletePost: async (postId: string): Promise<void> => {
    await api.delete(`/api/admin/blog/${postId}`);
  },

  deleteComment: async (commentId: string): Promise<void> => {
    await api.delete(`/api/admin/blog/comments/${commentId}`);
  },

  deleteImage: async (imageId: string): Promise<void> => {
    await api.delete(`/api/admin/blog/images/${imageId}`);
  },

  sendDigest: async (subject?: string, customMessage?: string): Promise<string> => {
    const res = await api.post<string>('/api/admin/blog/digest/send', { subject, customMessage });
    return res.data;
  },

  // Public
  getPublishedPosts: async (category?: string, page = 0, size = 9): Promise<BlogPage> => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (category) params.append('category', category);
    const res = await api.get<BlogPage>(`/api/public/blog/posts?${params}`);
    return res.data;
  },

  getPostDetail: async (postId: string): Promise<BlogPostDetail> => {
    const res = await api.get<BlogPostDetail>(`/api/public/blog/posts/${postId}`);
    return res.data;
  },

  getCategories: async (): Promise<string[]> => {
    const res = await api.get<string[]>('/api/public/blog/categories');
    return res.data;
  },

  toggleLike: async (postId: string): Promise<boolean> => {
    const res = await api.post<boolean>(`/api/public/blog/posts/${postId}/like`);
    return res.data;
  },

  addComment: async (postId: string, content: string): Promise<BlogComment> => {
    const res = await api.post<BlogComment>(`/api/public/blog/posts/${postId}/comments`, { content });
    return res.data;
  },
};

export default BlogService;
