// services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
});

// Interceptor para token JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

// services/blockchain.ts
export const blockchainService = {
  // ROTA PÚBLICA (não precisa de token)
  getTraceability: (batchId: string) =>
    api.get(`/blockchain/batch/${batchId}/traceability`),

  getBatch: (batchId: string) =>
    api.get(`/blockchain/batch/${batchId}`),

  checkExists: (batchId: string) =>
    api.get(`/blockchain/batch/${batchId}/exists`),

  getAllBatches: () =>
    api.get('/blockchain/batches'),
};

// services/batches.ts
export const batchesService = {
  getAll: () => api.get('/batches'),
  getOne: (batchId: string) => api.get(`/batches/${batchId}`),
  create: (data: any) => api.post('/batches', data),
  addSupplier: (batchId: string, data: any) =>
    api.post(`/batches/${batchId}/suppliers`, data),
  calculateCO2: (batchId: string) =>
    api.post(`/batches/${batchId}/calculate-co2`),
  registerBlockchain: (batchId: string) =>
    api.post(`/batches/${batchId}/register-blockchain`),
};

// services/documents.ts
export const documentsService = {
  upload: (formData: FormData) =>
    api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getAll: () => api.get('/documents'),
  getPending: () => api.get('/documents/pending'),
  getAwaitingReview: () => api.get('/documents/awaiting-review'),
  extractAI: (id: string) => api.post(`/documents/${id}/extract-ai`),
  validate: (id: string, extractedData: any) =>
    api.post(`/documents/${id}/validate`, { extractedData }),
  registerBlockchain: (id: string, notes: string) =>
    api.post(`/documents/${id}/blockchain/register`, { notes }),
  reject: (id: string, reason: string) =>
    api.post(`/documents/${id}/reject`, { reason }),
};
