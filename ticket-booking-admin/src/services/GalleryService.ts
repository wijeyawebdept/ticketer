import api from './api';

export interface GalleryImage {
  galleryId: string;
  title?: string;
  description?: string;
  category: string;
  imageBase64?: string;
  imageFileName: string;
  imageContentType: string;
  imageSize: number;
  displayOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GalleryPageResponse {
  content: GalleryImage[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}

const GalleryService = {
  createGalleryImage: async (formData: FormData): Promise<GalleryImage> => {
    const response = await api.post<GalleryImage>('/api/admin/gallery', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  updateGalleryImage: async (id: string, formData: FormData): Promise<GalleryImage> => {
    const response = await api.put<GalleryImage>(`/api/admin/gallery/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getAllGalleryImages: async (page: number = 0, size: number = 10): Promise<GalleryPageResponse> => {
    const response = await api.get<GalleryPageResponse>(`/api/admin/gallery/all?page=${page}&size=${size}`);
    return response.data;
  },

  getGalleryImageById: async (id: string): Promise<GalleryImage> => {
    const response = await api.get<GalleryImage>(`/api/admin/gallery/${id}`);
    return response.data;
  },

  deleteGalleryImage: async (id: string): Promise<void> => {
    await api.delete(`/api/admin/gallery/${id}`);
  },

  toggleActiveStatus: async (id: string): Promise<GalleryImage> => {
    const response = await api.put<GalleryImage>(`/api/admin/gallery/${id}/toggle-status`);
    return response.data;
  },

  reorderGalleryImages: async (ids: string[]): Promise<void> => {
    await api.post('/api/admin/gallery/reorder', ids);
  },

  // Public endpoint
  getPublicGallery: async (): Promise<GalleryImage[]> => {
    const response = await api.get<GalleryImage[]>('/api/public/gallery/active');
    return response.data;
  },
};

export default GalleryService;

