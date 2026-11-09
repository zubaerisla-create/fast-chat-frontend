export interface User {
  _id: string;
  username: string;
  email: string;
  avatar: string;
  isOnline?: boolean;
  lastSeen?: string;
  createdAt?: string;
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: {
    _id: string;
    username: string;
    avatar: string;
  };
  text: string;
  isRead: boolean;
  fileUrl?: string;
  fileType?: 'image' | 'video' | 'file' | 'voice' | 'audio';
  fileName?: string;
  fileSize?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface LastMessage {
  _id: string;
  text: string;
  senderId: string;
  createdAt: string;
}

export interface Conversation {
  _id: string;
  type?: 'direct' | 'group' | 'channel';
  title?: string;
  description?: string;
  avatar?: string;
  participants: User[];
  members?: { _id: string; id: string; username: string; avatar: string; email?: string; role: 'owner' | 'admin' | 'member' }[];
  memberCount?: number;
  myRole?: 'owner' | 'admin' | 'member';
  lastMessage: LastMessage | null;
  createdAt: string;
  updatedAt: string;
}

export interface FriendRequest {
  _id: string;
  id: string;
  senderId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'canceled';
  createdAt: string;
  updatedAt: string;
  sender?: User;
  receiver?: User;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token: string;
  user: User;
}

export interface PaginatedMessages {
  success: boolean;
  total: number;
  page: number;
  pages: number;
  messages: Message[];
}

export interface InitiateCallData {
  callerId: string;
  receiverId: string;
  channelName: string;
  callType: 'audio' | 'video';
}

export interface AgoraTokenResponse {
  token: string;
  appId: string;
}

export interface CallData {
  callerId: User;
  receiverId: string;
  channelName: string;
  callType: 'audio' | 'video';
}
