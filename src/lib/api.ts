import axios from 'axios';
import Cookies from 'js-cookie';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = Cookies.get('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      Cookies.remove('token');
      Cookies.remove('user');
      if (typeof window !== 'undefined') {
        window.location.href = '/auth';
      }
    }
    return Promise.reject(err);
  }
);

// Auth
export const registerUser = (data: { username: string; email: string; password: string }) =>
  api.post('/api/auth/register', data);

export const loginUser = (data: { email: string; password: string }) =>
  api.post('/api/auth/login', data);

// Users
export const getAllUsers = () => api.get('/api/users');
export const searchUsers = (query: string) => api.get(`/api/users/search?query=${query}`);
export const getUserById = (id: string) => api.get(`/api/users/${id}`);

// Conversations
export const createConversation = (receiverId: string) =>
  api.post('/api/conversations', { receiverId });
export const getConversations = () => api.get('/api/conversations');
export const getConversationById = (id: string) => api.get(`/api/conversations/${id}`);

// Messages
export const sendMessage = (
  conversationId: string,
  text: string,
  fileData?: { fileUrl?: string; fileType?: string; fileName?: string; fileSize?: number }
) =>
  api.post('/api/messages', { conversationId, text, ...fileData });

export const uploadFile = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/api/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
export const getMessages = (conversationId: string, page = 1, limit = 50) =>
  api.get(`/api/messages/${conversationId}?page=${page}&limit=${limit}`);

// Agora & Calling
export const getAgoraToken = (channelName: string, uid: number) =>
  api.post('/api/agora/token', { channelName, uid });

export const initiateCall = (data: { callerId: string; receiverId: string; channelName: string; callType: 'audio' | 'video' }) =>
  api.post('/api/call/initiate', data);

export const endCall = (channelName: string, userId: string) =>
  api.post('/api/call/end', { channelName, userId });

export default api;
