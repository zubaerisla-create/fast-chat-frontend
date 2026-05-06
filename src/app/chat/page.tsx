'use client';

import { useState } from 'react';
import { Conversation } from '@/types';
import Sidebar from '@/components/chat/Sidebar';
import ChatWindow from '@/components/chat/ChatWindow';
import EmptyChat from '@/components/chat/EmptyChat';

export default function ChatPage() {
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);

  const handleSelectConversation = (conv: Conversation) => {
    setActiveConversation(conv);
    // On mobile, hide sidebar when conversation selected
    if (window.innerWidth < 768) setShowSidebar(false);
  };

  const handleBack = () => {
    setShowSidebar(true);
    setActiveConversation(null);
  };

  return (
    <div className="flex h-screen bg-[#0D0D1A] overflow-hidden">
      {/* Sidebar - hidden on mobile when chat open */}
      <div
        className={`${
          showSidebar ? 'flex' : 'hidden md:flex'
        } flex-shrink-0`}
      >
        <Sidebar
          activeConversationId={activeConversation?._id}
          onSelectConversation={handleSelectConversation}
        />
      </div>

      {/* Main chat area */}
      <div className={`flex-1 flex flex-col ${!showSidebar || activeConversation ? 'flex' : 'hidden md:flex'}`}>
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
