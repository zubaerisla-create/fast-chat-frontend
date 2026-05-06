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
  participants: User[];
  lastMessage: LastMessage | null;
  createdAt: string;
  updatedAt: string;
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
