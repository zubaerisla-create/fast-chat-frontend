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
    // A 401 from /api/auth/* is a bad credential, not an expired session — let the form show the error
    if (err.response?.status === 401 && !err.config?.url?.startsWith('/api/auth/')) {
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
export const sendSignupOTP = (data: { email: string; username?: string }) =>
  api.post('/api/auth/send-otp', data);

export const registerUser = (data: { username: string; email: string; password: string; otp: string }) =>
  api.post('/api/auth/register', data);

export const loginUser = (data: { email: string; password: string }) =>
  api.post('/api/auth/login', data);

// Users
export const getAllUsers = () => api.get('/api/users');
export const searchUsers = (query: string) => api.get(`/api/users/search?query=${query}`);
export const searchUserByExactUsername = (username: string) =>
  api.get(`/api/users/search/exact?username=${encodeURIComponent(username)}`);
export const getUserById = (id: string) => api.get(`/api/users/${id}`);
export const getBlockedUsers = () => api.get('/api/users/blocked');
export const blockUser = (userId: string) => api.post(`/api/users/${userId}/block`);
export const unblockUser = (userId: string) => api.post(`/api/users/${userId}/unblock`);
export const updateProfile = (data: FormData) =>
  api.put('/api/users/profile', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

// Friend / Message Requests
export const sendFriendRequest = (data: { receiverId?: string; username?: string }) =>
  api.post('/api/friends/requests', data);
export const getFriendRequests = () => api.get('/api/friends/requests');
export const acceptFriendRequest = (requestId: string) =>
  api.post(`/api/friends/requests/${requestId}/accept`);
export const rejectFriendRequest = (requestId: string) =>
  api.post(`/api/friends/requests/${requestId}/reject`);
export const cancelFriendRequest = (requestId: string) =>
  api.post(`/api/friends/requests/${requestId}/cancel`);
export const getFriends = () => api.get('/api/friends');
export const getRelationshipStatus = (userId: string) => api.get(`/api/friends/status/${userId}`);

// Conversations & Groups
export const createConversation = (receiverId: string) =>
  api.post('/api/conversations', { receiverId });
export const createGroupConversation = (data: {
  title: string;
  description?: string;
  avatar?: string;
  memberIds?: string[];
}) => api.post('/api/conversations/groups', data);
export const updateGroupConversation = (
  id: string,
  data: { title?: string; description?: string; avatar?: string }
) => api.patch(`/api/conversations/${id}`, data);
export const addGroupMembers = (conversationId: string, userIds: string[]) =>
  api.post(`/api/conversations/${conversationId}/members`, { userIds });
export const removeGroupMember = (conversationId: string, userId: string) =>
  api.delete(`/api/conversations/${conversationId}/members/${userId}`);
export const leaveGroup = (conversationId: string, currentUserId: string) =>
  api.delete(`/api/conversations/${conversationId}/members/${currentUserId}`);
export const getConversations = () => api.get('/api/conversations');
export const getConversationById = (id: string) => api.get(`/api/conversations/${id}`);
export const getConversationMedia = (id: string) => api.get(`/api/conversations/${id}/media`);

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

export const sendVoiceMessage = (conversationId: string, audioBlob: Blob) => {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'voice.webm');
  formData.append('conversationId', conversationId);
  return api.post('/api/messages/voice', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// Agora & Calling
export const getAgoraToken = (channelName: string, uid: number) =>
  api.post('/api/agora/token', { channelName, uid });

export const initiateCall = (data: { callerId: string; receiverId: string; channelName: string; callType: 'audio' | 'video' }) =>
  api.post('/api/call/initiate', data);

export const endCall = (channelName: string, userId: string) =>
  api.post('/api/call/end', { channelName, userId });

export default api;

// Billing
export const startCheckout = (priceId: string) =>
  api.post<{ success: boolean; transactionId: string; plan: string; interval: string; hasActiveSubscription?: boolean }>('/api/billing/checkout', { priceId });

export const getMyBilling = () => api.get('/api/billing/me');

export const openBillingPortal = () => api.post<{ success: boolean; url: string }>('/api/billing/portal');

export const getAdminBillingSummary = () => api.get('/api/admin/billing/summary');

// ── Finance API ───────────────────────────────────────────────────────────────
export const getFinanceDashboard = () => api.get('/api/finance/dashboard');
export const getFinanceProfile = () => api.get('/api/finance/profile');
export const updateFinanceProfile = (data: any) => api.put('/api/finance/profile', data);
export const runFinanceSimulation = (data: any) => api.post('/api/finance/simulate', data);
export const getFinanceSimulations = (limit = 20) => api.get(`/api/finance/simulations?limit=${limit}`);
export const getFinanceSimulationById = (id: string) => api.get(`/api/finance/simulations/${id}`);
export const getFinanceBusinesses = () => api.get('/api/finance/businesses');
export const getFinanceBusinessById = (id: string, month?: string) =>
  api.get(`/api/finance/businesses/${id}${month ? `?month=${month}` : ''}`);
export const createFinanceBusiness = (data: any) => api.post('/api/finance/businesses', data);
export const updateFinanceBusiness = (id: string, data: any) => api.put(`/api/finance/businesses/${id}`, data);
export const deleteFinanceBusiness = (id: string) => api.delete(`/api/finance/businesses/${id}`);
export const getFinanceTransactions = (params?: { businessId?: string; type?: string; search?: string; limit?: number; page?: number }) => {
  const query = new URLSearchParams();
  if (params?.businessId) query.set('businessId', params.businessId);
  if (params?.type) query.set('type', params.type);
  if (params?.search) query.set('search', params.search);
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.page) query.set('page', String(params.page));
  return api.get(`/api/finance/transactions?${query.toString()}`);
};
export const createFinanceTransaction = (data: any) => api.post('/api/finance/transactions', data);
export const updateFinanceTransaction = (id: string, data: any) => api.put(`/api/finance/transactions/${id}`, data);
export const deleteFinanceTransaction = (id: string) => api.delete(`/api/finance/transactions/${id}`);
export const getFinanceGoals = () => api.get('/api/finance/goals');
export const createFinanceGoal = (data: any) => api.post('/api/finance/goals', data);
export const updateFinanceGoal = (id: string, data: any) => api.patch(`/api/finance/goals/${id}`, data);
export const deleteFinanceGoal = (id: string) => api.delete(`/api/finance/goals/${id}`);
