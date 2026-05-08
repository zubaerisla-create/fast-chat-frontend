# fast-Chat — Next.js Frontend

A sleek, real-time chat application built with Next.js 14, TypeScript, and Tailwind CSS.

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:5000     # Your backend API URL
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000  # Your Socket.io URL
```

### 3. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
src/
├── app/
│   ├── auth/page.tsx        # Login & Register page
│   ├── chat/
│   │   ├── layout.tsx       # Auth guard
│   │   └── page.tsx         # Main chat page
│   ├── layout.tsx           # Root layout with providers
│   ├── page.tsx             # Redirect to /auth or /chat
│   └── globals.css          # Global styles
├── components/
│   ├── chat/
│   │   ├── Sidebar.tsx      # Conversations sidebar
│   │   ├── ChatWindow.tsx   # Message area
│   │   ├── MessageBubble.tsx
│   │   └── EmptyChat.tsx
│   └── ui/
│       └── Avatar.tsx
├── context/
│   ├── AuthContext.tsx      # JWT auth state
│   └── SocketContext.tsx    # Socket.io connection
├── lib/
│   └── api.ts               # Axios API calls
└── types/
    └── index.ts             # TypeScript types
```

## Features

- **Auth**: Register & Login with JWT (stored in cookies)
- **Conversations**: Create, list, select conversations
- **Messages**: Send & receive messages with pagination support
- **Search**: Find users by username/email
- **Real-time**: Socket.io integration for live updates
- **Polling**: Fallback 3s message polling + 5s conversation polling
- **Optimistic UI**: Messages appear instantly before server confirmation
- **Responsive**: Mobile-friendly with sidebar toggle
- **Online Status**: Real-time online indicator
- **Date Groups**: Messages grouped by date with dividers

## API Endpoints Used

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register |
| POST | /api/auth/login | Login |
| GET | /api/users | Get all users |
| GET | /api/users/search | Search users |
| GET | /api/conversations | Get my conversations |
| POST | /api/conversations | Create conversation |
| GET | /api/messages/:id | Get messages |
| POST | /api/messages | Send message |
