// Typed client for the SaaS API (workspaces, conversations, messages, tasks, notifications,
// billing usage, admin). All calls go through the shared axios instance (JWT from the cookie).
import api from './api';

export type Role = 'owner' | 'admin' | 'manager' | 'member' | 'guest';
export type ConversationType = 'direct' | 'group' | 'channel';

export interface PublicUser {
  _id: string;
  id: string;
  username: string;
  email?: string;
  avatar: string;
  isOnline?: boolean;
  lastSeen?: string;
  role?: string;
}

export interface Reaction {
  _id: string;
  userId: { _id: string; username: string; avatar: string };
  emoji: string;
}

export interface Attachment {
  url: string;
  type: 'image' | 'video' | 'audio' | 'file';
  name?: string | null;
  size?: number | null;
}

export interface ChatMessage {
  _id: string;
  id: string;
  conversationId: string;
  senderId: { _id: string; id: string; username: string; avatar: string } | string;
  kind: 'user' | 'system';
  text: string;
  replyToMessageId: string | null;
  replyToText: string | null;
  replyToSenderId: string | null;
  fileUrl: string | null;
  fileType: 'image' | 'video' | 'audio' | 'file' | null;
  fileName: string | null;
  fileSize: number | null;
  audioDuration: number | null;
  attachments: Attachment[];
  linkPreview: { url: string; title: string; description?: string | null; image?: string | null; siteName?: string } | null;
  forwarded: boolean;
  isRead: boolean;
  deliveredAt: string | null;
  editedAt: string | null;
  deletedAt: string | null;
  isPinned: boolean;
  clientId: string | null;
  reactions: Reaction[];
  createdAt: string;
  // client-only state for optimistic sends
  pending?: boolean;
  failed?: boolean;
}

export interface Conversation {
  _id: string;
  id: string;
  type: ConversationType;
  title: string | null;
  description: string | null;
  avatar: string | null;
  workspaceId: string | null;
  visibility: 'public' | 'private' | null;
  adminsOnlyPost: boolean;
  participants: PublicUser[];
  members: (PublicUser & { role: 'owner' | 'admin' | 'member' })[];
  memberCount: number;
  lastMessage: ChatMessage | null;
  lastMessageTime: string;
  unreadCount: number;
  myRole: 'owner' | 'admin' | 'member';
  mutedUntil: string | null;
  pinnedAt: string | null;
  archivedAt: string | null;
}

export interface Workspace {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  settings: { minInviteRole?: Role; minChannelCreateRole?: Role };
  myRole: Role;
  memberCount: number;
  unreadCount?: number;
  organization?: { id: string; name: string; logo: string | null; ownerId: string };
}

export interface Channel {
  id: string;
  name: string;
  description: string | null;
  visibility: 'public' | 'private';
  kind: string | null;
  adminsOnlyPost: boolean;
  joined: boolean;
  myRole: string | null;
  muted: boolean;
  memberCount: number;
  unreadCount: number;
  lastMessageAt: string | null;
}

export interface WorkspaceMember extends PublicUser {
  role: Role;
  title: string | null;
  joinedAt: string;
  lastActiveAt: string | null;
}

export interface Invitation {
  id: string;
  email: string;
  role: Role;
  expiresAt: string;
  createdAt?: string;
  invitedBy?: string;
  link?: string;
  emailed?: boolean;
}

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export interface Task {
  id: string;
  workspaceId: string | null;
  workspaceName: string | null;
  conversationId: string | null;
  conversationTitle: string | null;
  sourceMessageId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: string | null;
  assignee: { id: string; username: string; avatar: string } | null;
  creator: { id: string; username: string; avatar: string } | null;
  commentCount: number;
  completedAt: string | null;
  overdue: boolean;
  createdAt: string;
  updatedAt: string;
}
export type TaskSummary = Record<TaskStatus | 'overdue', number>;

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, string>;
  readAt: string | null;
  createdAt: string;
  actor: { id: string; username: string; avatar: string } | null;
}

export const errorMessage = (err: unknown, fallback = 'Something went wrong. Please try again.') =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

export const newClientId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

// ─── Conversations & messages ────────────────────────────────────────────────
export const conversations = {
  list: (type?: ConversationType) => api.get<{ conversations: Conversation[] }>(`/api/conversations${type ? `?type=${type}` : ''}`).then((r) => r.data.conversations),
  get: (id: string) => api.get<{ conversation: Conversation }>(`/api/conversations/${id}`).then((r) => r.data.conversation),
  search: (q: string) => api.get<{ conversations: Conversation[] }>(`/api/conversations/search?q=${encodeURIComponent(q)}`).then((r) => r.data.conversations),
  direct: (receiverId: string) => api.post<{ conversation: Conversation }>('/api/conversations', { receiverId }).then((r) => r.data.conversation),
  createGroup: (body: { title: string; description?: string; memberIds: string[] }) => api.post<{ conversation: Conversation }>('/api/conversations/groups', body).then((r) => r.data.conversation),
  update: (id: string, body: Partial<{ title: string; description: string | null; adminsOnlyPost: boolean }>) => api.patch<{ conversation: Conversation }>(`/api/conversations/${id}`, body).then((r) => r.data.conversation),
  membership: (id: string, body: Partial<{ muted: boolean; pinned: boolean; archived: boolean }>) => api.patch<{ conversation: Conversation }>(`/api/conversations/${id}/membership`, body).then((r) => r.data.conversation),
  addMembers: (id: string, userIds: string[]) => api.post(`/api/conversations/${id}/members`, { userIds }),
  removeMember: (id: string, userId: string) => api.delete(`/api/conversations/${id}/members/${userId}`),
  setRole: (id: string, userId: string, role: string) => api.patch(`/api/conversations/${id}/members/${userId}`, { role }),
  inviteLink: (id: string, regenerate = false) => api.post<{ code: string }>(`/api/conversations/${id}/invite-link`, { regenerate }).then((r) => r.data.code),
  previewInvite: (code: string) => api.get(`/api/conversations/join/${code}`).then((r) => r.data.group as { id: string; title: string; description: string | null; memberCount: number; isMember: boolean }),
  joinInvite: (code: string) => api.post<{ conversation: Conversation }>(`/api/conversations/join/${code}`).then((r) => r.data.conversation),
  media: (id: string) => api.get<{ media: ChatMessage[] }>(`/api/conversations/${id}/media`).then((r) => r.data.media),
};

export const messages = {
  page: (conversationId: string, before?: string | null, limit = 40) =>
    api
      .get<{ messages: ChatMessage[]; hasMore: boolean; nextCursor: string | null }>(`/api/messages/${conversationId}?limit=${limit}${before ? `&before=${before}` : ''}`)
      .then((r) => r.data),
  send: (body: { conversationId: string; text?: string; clientId: string; replyToMessageId?: string | null; attachments?: Attachment[] }) =>
    api.post<{ message: ChatMessage }>('/api/messages', body).then((r) => r.data.message),
  voice: (conversationId: string, blob: Blob, duration: number, clientId: string) => {
    const fd = new FormData();
    fd.append('audio', blob, blob.type.includes('mp4') ? 'voice.m4a' : 'voice.webm');
    fd.append('conversationId', conversationId);
    fd.append('audioDuration', String(duration));
    fd.append('clientId', clientId);
    return api.post<{ message: ChatMessage }>('/api/messages/voice', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data.message);
  },
  edit: (id: string, text: string) => api.patch<{ message: ChatMessage }>(`/api/messages/${id}`, { text }).then((r) => r.data.message),
  remove: (id: string) => api.delete(`/api/messages/${id}`),
  react: (id: string, emoji: string) => api.patch(`/api/messages/${id}/react`, { emoji }),
  forward: (id: string, conversationIds: string[]) => api.post(`/api/messages/${id}/forward`, { conversationIds }),
  pin: (id: string, pinned: boolean) => (pinned ? api.post(`/api/messages/${id}/pin`) : api.delete(`/api/messages/${id}/pin`)),
  pins: (conversationId: string) => api.get<{ messages: ChatMessage[] }>(`/api/messages/${conversationId}/pins`).then((r) => r.data.messages),
  bookmark: (id: string) => api.post<{ bookmarked: boolean }>(`/api/messages/${id}/bookmark`).then((r) => r.data.bookmarked),
  bookmarks: () => api.get<{ messages: ChatMessage[] }>('/api/messages/bookmarks').then((r) => r.data.messages),
  report: (id: string, reason: string) => api.post(`/api/messages/${id}/report`, { reason }),
  search: (q: string, conversationId?: string) =>
    api.get<{ messages: ChatMessage[] }>(`/api/messages/search?q=${encodeURIComponent(q)}${conversationId ? `&conversationId=${conversationId}` : ''}`).then((r) => r.data.messages),
  markRead: (conversationId: string) => api.patch(`/api/messages/${conversationId}/mark-read`),
  readReceipts: (conversationId: string) =>
    api.get<{ readers: { userId: string; username: string; avatar: string; lastReadAt: string }[] }>(`/api/messages/${conversationId}/read-receipts`).then((r) => r.data.readers),
  toTask: (id: string, body: Partial<{ assigneeId: string; priority: TaskPriority; dueAt: string }> = {}) => api.post<{ task: Task }>(`/api/messages/${id}/task`, body).then((r) => r.data.task),
  upload: (file: File, onProgress?: (pct: number) => void) => {
    const fd = new FormData();
    fd.append('file', file);
    return api
      .post<{ url: string; fileType: Attachment['type']; fileName: string; fileSize: number }>('/api/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
      })
      .then((r) => ({ url: r.data.url, type: r.data.fileType, name: r.data.fileName, size: r.data.fileSize }) as Attachment);
  },
};

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = {
  search: (q: string) => api.get<{ users: PublicUser[] }>(`/api/users/search?query=${encodeURIComponent(q)}`).then((r) => r.data.users ?? []),
  blocked: () => api.get<{ users: PublicUser[] }>('/api/users/blocked').then((r) => r.data.users),
  block: (id: string) => api.post(`/api/users/${id}/block`),
  unblock: (id: string) => api.delete(`/api/users/${id}/block`),
  updateProfile: (fd: FormData) => api.put('/api/users/profile', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data),
};

// ─── Workspaces ──────────────────────────────────────────────────────────────
export const workspaces = {
  list: () => api.get<{ workspaces: Workspace[] }>('/api/workspaces').then((r) => r.data.workspaces),
  get: (id: string) =>
    api
      .get<{ workspace: Workspace; permissions: Record<string, boolean>; assignableRoles: Role[]; plan: { id: string; name: string; limits: { membersPerWorkspace: number | null; channelsPerWorkspace: number | null; groupCalls: boolean } } }>(`/api/workspaces/${id}`)
      .then((r) => r.data),
  create: (body: { name: string; description?: string; organizationId?: string }) => api.post<{ workspace: Workspace }>('/api/workspaces', body).then((r) => r.data.workspace),
  update: (id: string, body: Partial<{ name: string; description: string | null; settings: Workspace['settings'] }>) => api.patch<{ workspace: Workspace }>(`/api/workspaces/${id}`, body).then((r) => r.data.workspace),
  remove: (id: string, confirm: string) => api.delete(`/api/workspaces/${id}`, { data: { confirm } }),
  transfer: (id: string, userId: string) => api.post(`/api/workspaces/${id}/transfer`, { userId }),
  members: (id: string, q = '', offset = 0) =>
    api.get<{ members: WorkspaceMember[]; total: number }>(`/api/workspaces/${id}/members?q=${encodeURIComponent(q)}&limit=50&offset=${offset}`).then((r) => r.data),
  updateMember: (id: string, userId: string, body: Partial<{ role: Role; title: string | null }>) => api.patch(`/api/workspaces/${id}/members/${userId}`, body),
  removeMember: (id: string, userId: string) => api.delete(`/api/workspaces/${id}/members/${userId}`),
  invitations: (id: string) => api.get<{ invitations: Invitation[] }>(`/api/workspaces/${id}/invitations`).then((r) => r.data.invitations),
  invite: (id: string, emails: string[], role: Role) => api.post<{ invitations: Invitation[] }>(`/api/workspaces/${id}/invitations`, { emails, role }).then((r) => r.data.invitations),
  revokeInvitation: (id: string, invitationId: string) => api.delete(`/api/workspaces/${id}/invitations/${invitationId}`),
  channels: (id: string) => api.get<{ channels: Channel[] }>(`/api/workspaces/${id}/channels`).then((r) => r.data.channels),
  createChannel: (id: string, body: { name: string; description?: string; visibility: 'public' | 'private'; kind?: string; memberIds?: string[] }) =>
    api.post<{ channel: Channel }>(`/api/workspaces/${id}/channels`, body).then((r) => r.data.channel),
  updateChannel: (id: string, channelId: string, body: Partial<{ name: string; description: string | null; visibility: 'public' | 'private'; adminsOnlyPost: boolean }>) =>
    api.patch(`/api/workspaces/${id}/channels/${channelId}`, body),
  deleteChannel: (id: string, channelId: string) => api.delete(`/api/workspaces/${id}/channels/${channelId}`),
  joinChannel: (id: string, channelId: string) => api.post(`/api/workspaces/${id}/channels/${channelId}/join`),
  leaveChannel: (id: string, channelId: string) => api.post(`/api/workspaces/${id}/channels/${channelId}/leave`),
  addChannelMembers: (id: string, channelId: string, userIds: string[]) => api.post(`/api/workspaces/${id}/channels/${channelId}/members`, { userIds }),
  removeChannelMember: (id: string, channelId: string, userId: string) => api.delete(`/api/workspaces/${id}/channels/${channelId}/members/${userId}`),
  activity: (id: string) =>
    api.get<{ events: { id: number; action: string; actor: string | null; metadata: Record<string, unknown>; createdAt: string; targetType: string | null }[] }>(`/api/workspaces/${id}/activity`).then((r) => r.data.events),
};

export const organizations = {
  list: () => api.get<{ organizations: { id: string; name: string; logo: string | null; ownerId: string; isOwner: boolean; workspaceCount: number; createdAt: string }[] }>('/api/organizations').then((r) => r.data.organizations),
  update: (id: string, body: { name?: string }) => api.patch(`/api/organizations/${id}`, body),
};

export const invitations = {
  mine: () => api.get<{ invitations: { id: string; role: Role; expiresAt: string; invitedBy: string; workspace: { id: string; name: string; logo: string | null } }[] }>('/api/invitations').then((r) => r.data.invitations),
  preview: (token: string) =>
    api.get<{ invitation: { state: 'pending' | 'accepted' | 'expired' | 'revoked'; role: Role; workspace: { id: string; name: string }; invitedBy: string; email: string; expiresAt: string } }>(`/api/invitations/${token}`).then((r) => r.data.invitation),
  accept: (token: string) => api.post<{ workspace: Workspace }>(`/api/invitations/${token}/accept`).then((r) => r.data.workspace),
  acceptById: (id: string) => api.post<{ workspace: Workspace }>(`/api/invitations/id/${id}/accept`).then((r) => r.data.workspace),
};

// ─── Tasks ───────────────────────────────────────────────────────────────────
export const tasks = {
  list: (params: { scope?: 'mine' | 'workspace'; workspaceId?: string; status?: TaskStatus } = {}) =>
    api.get<{ tasks: Task[]; summary: TaskSummary }>(`/api/tasks?${new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][])}`).then((r) => r.data),
  get: (id: string) => api.get<{ task: Task; comments: { id: string; body: string; author: { id: string; username: string; avatar: string }; createdAt: string }[] }>(`/api/tasks/${id}`).then((r) => r.data),
  create: (body: Partial<Task> & { title: string; workspaceId?: string | null; assigneeId?: string | null }) => api.post<{ task: Task }>('/api/tasks', body).then((r) => r.data.task),
  update: (id: string, body: Partial<{ title: string; description: string | null; status: TaskStatus; priority: TaskPriority; dueAt: string | null; assigneeId: string | null }>) =>
    api.patch<{ task: Task }>(`/api/tasks/${id}`, body).then((r) => r.data.task),
  remove: (id: string) => api.delete(`/api/tasks/${id}`),
  comment: (id: string, body: string) => api.post(`/api/tasks/${id}/comments`, { body }),
};

// ─── Notifications ───────────────────────────────────────────────────────────
export const notificationsApi = {
  list: (unreadOnly = false) => api.get<{ notifications: AppNotification[]; unread: number }>(`/api/notifications?limit=50${unreadOnly ? '&unread=true' : ''}`).then((r) => r.data),
  markRead: (ids?: string[]) => api.post('/api/notifications/read', ids ? { ids } : {}),
  preferences: () => api.get<{ preferences: { category: string; push: boolean; inApp: boolean }[] }>('/api/notifications/preferences').then((r) => r.data.preferences),
  setPreference: (category: string, body: { push?: boolean; inApp?: boolean }) =>
    api.put<{ preferences: { category: string; push: boolean; inApp: boolean }[] }>(`/api/notifications/preferences/${category}`, body).then((r) => r.data.preferences),
};

// ─── Billing & admin ─────────────────────────────────────────────────────────
export interface UsageResponse {
  plan: { id: string; name: string };
  usage: {
    storage: { used: number; limit: number | null };
    workspaces: { used: number; limit: number | null };
    maxFileBytes: number;
    aiRequests: { used: number | null; limit: number | null; available: boolean };
    groupCalls: boolean;
  };
  workspaces: { id: string; name: string; members: { used: number; limit: number | null }; channels: { used: number; limit: number | null } }[];
}
export const billing = {
  me: () => api.get('/api/billing/me').then((r) => r.data),
  usage: () => api.get<UsageResponse>('/api/billing/usage').then((r) => r.data),
  portal: () => api.post<{ url: string }>('/api/billing/portal').then((r) => r.data.url),
};

export const admin = {
  overview: (days = 30) => api.get(`/api/admin/overview?days=${days}`).then((r) => r.data),
  users: (q = '', offset = 0) => api.get(`/api/admin/users?q=${encodeURIComponent(q)}&limit=20&offset=${offset}`).then((r) => r.data),
  organizations: (q = '') => api.get(`/api/admin/organizations?q=${encodeURIComponent(q)}`).then((r) => r.data.organizations),
  audit: () => api.get('/api/admin/audit?limit=50').then((r) => r.data.events),
  reports: () => api.get('/api/admin/reports').then((r) => r.data.reports),
  updateReport: (id: string, status: string) => api.patch(`/api/admin/reports/${id}`, { status }),
  billingSummary: () => api.get('/api/admin/billing/summary').then((r) => r.data),
};
