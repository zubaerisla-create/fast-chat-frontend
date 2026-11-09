'use client';

import { useState } from 'react';
import { Conversation } from '@/types';
import Sidebar from '@/components/chat/Sidebar';
import ChatWindow from '@/components/chat/ChatWindow';
import EmptyChat from '@/components/chat/EmptyChat';

export default function ChatPage() {
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);

  const handleSelectConversation = (conv: Conversation) => {
    setActiveConversation(conv);
  };

  const handleBack = () => {
    setActiveConversation(null);
  };

  return (
    <div className="flex h-[100dvh] bg-[#0D0D1A] overflow-hidden">
      {/* Sidebar - full width on mobile unless hidden by active conversation */}
      <div
        className={`flex-shrink-0 w-full md:w-auto h-full ${activeConversation ? 'hidden md:flex' : 'flex'
          }`}
      >
        <Sidebar
          activeConversationId={activeConversation?._id}
          onSelectConversation={handleSelectConversation}
        />
      </div>

      {/* Main chat area */}
      <div className={`flex-1 min-w-0 h-full flex flex-col ${!activeConversation ? 'hidden md:flex' : 'flex'}`}>
        {activeConversation ? (
          <ChatWindow
            key={activeConversation._id}
            conversation={activeConversation}
            onBack={handleBack}
          />
        ) : (
          <EmptyChat />
        )}
      </div>
    </div>
  );
}
