// simpgpt/app/page.tsx

'use client';

import { useState, useRef, useEffect } from 'react';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
};

type Chat = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  isTemporary?: boolean;
};

export default function ChatPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTemporaryMode, setIsTemporaryMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chats from localStorage on mount
  useEffect(() => {
    const savedChats = localStorage.getItem('simpgpt-chats');
    if (savedChats) {
      const parsedChats = JSON.parse(savedChats);
      const permanentChats = parsedChats.filter((chat: Chat) => !chat.isTemporary);

      if (permanentChats.length > 0) {
        setChats(permanentChats);
        setCurrentChatId(permanentChats[0].id);
      } else {
        createInitialChat(false);
      }
    } else {
      createInitialChat(false);
    }
  }, []);

  useEffect(() => {
    if (chats.length > 0) {
      localStorage.setItem('simpgpt-chats', JSON.stringify(chats));
    }
  }, [chats]);

  useEffect(() => {
    if (currentChatId) {
      setChats((prevChats) =>
        prevChats.map((chat) => {
          if (chat.id === currentChatId) {
            return { ...chat, isTemporary: isTemporaryMode };
          }
          return chat;
        })
      );
    }
  }, [isTemporaryMode, currentChatId]);

  const createInitialChat = (isTemporary: boolean) => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [
        {
          id: '1',
          role: 'assistant',
          content: isTemporary
            ? 'Hi! This is a temporary chat. It will be deleted when you refresh the page or start a new chat.'
            : 'Hi! I\'m SimpGPT. I explain things in simple, easy words. Ask me anything!',
          timestamp: Date.now(),
        },
      ],
      createdAt: Date.now(),
      isTemporary: isTemporary,
    };
    setChats([newChat]);
    setCurrentChatId(newChat.id);
  };

  const currentChat = chats.find((chat) => chat.id === currentChatId);
  const messages = currentChat?.messages || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !currentChatId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    setChats((prevChats) =>
      prevChats.map((chat) => {
        if (chat.id === currentChatId) {
          const updatedMessages = [...chat.messages, userMessage];
          const newTitle = chat.title === 'New Chat'
            ? input.trim().slice(0, 30)
            : chat.title;
          return { ...chat, messages: updatedMessages, title: newTitle };
        }
        return chat;
      })
    );

    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply
          .replace(/\n+/g, " ")
          .replace(/\s+(?=\d+\.)/g, "")
          .split(/(?=\b\d+\.\s)/)
          .join("\n")
          .trim(),
        timestamp: Date.now(),
      };

      setChats((prevChats) =>
        prevChats.map((chat) => {
          if (chat.id === currentChatId) {
            return { ...chat, messages: [...chat.messages, aiMessage] };
          }
          return chat;
        })
      );
    } catch (error) {
      console.error("AI Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewChat = () => {
    setChats((prevChats) => prevChats.filter((chat) => !chat.isTemporary));

    const newChat: Chat = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: isTemporaryMode
            ? 'Hi! This is a temporary chat. It will be deleted when you refresh the page or start a new chat.'
            : 'Hi! I\'m SimpGPT. I explain things in simple, easy words. Ask me anything!',
          timestamp: Date.now(),
        },
      ],
      createdAt: Date.now(),
      isTemporary: isTemporaryMode,
    };
    setChats((prev) => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    setIsSidebarOpen(false); // Close sidebar on mobile after creating chat
  };

  const deleteChat = (chatId: string) => {
    setChats((prev) => prev.filter((chat) => chat.id !== chatId));
    if (currentChatId === chatId) {
      const remainingChats = chats.filter((chat) => chat.id !== chatId);
      if (remainingChats.length > 0) {
        setCurrentChatId(remainingChats[0]?.id);
        setIsTemporaryMode(remainingChats[0]?.isTemporary || false);
      } else {
        createNewChat();
      }
    }
  };

  const selectChat = (chatId: string, isTemp: boolean) => {
    setCurrentChatId(chatId);
    setIsTemporaryMode(isTemp);
    setIsSidebarOpen(false); // Close sidebar on mobile after selecting chat
  };

  const toggleTemporaryMode = () => {
    setIsTemporaryMode(!isTemporaryMode);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatChatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-30 w-64 bg-gray-900 text-white transition-transform duration-300 flex flex-col`}
      >
        <div className="p-4 border-b border-gray-700">
          <button
            onClick={createNewChat}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            + New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => selectChat(chat.id, chat.isTemporary || false)}
              className={`group flex items-center justify-between px-3 py-2 mb-1 rounded-lg cursor-pointer transition-colors ${currentChatId === chat.id
                ? 'bg-gray-800'
                : 'hover:bg-gray-800'
                }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm truncate">{chat.title}</p>
                  {chat.isTemporary && (
                    <svg
                      className="w-3 h-3 text-orange-400 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  )}
                </div>
                <p className="text-xs text-gray-400">{formatChatTime(chat.createdAt)}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteChat(chat.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 ml-2 transition-opacity"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-3 sm:px-4 py-3 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
            >
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-blue-600 truncate">SimpGPT</h1>
              <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Simple answers for everyone</p>
            </div>
          </div>

          {/* Temporary Chat Toggle */}
          <button
            onClick={toggleTemporaryMode}
            className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-all flex-shrink-0 ${isTemporaryMode
              ? 'bg-orange-100 text-orange-800 border-2 border-orange-400'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            title={isTemporaryMode ? 'Temporary Chat Active' : 'Enable Temporary Chat'}
          >
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-xs sm:text-sm hidden sm:inline">
              {isTemporaryMode ? 'Temporary' : 'Temporary'}
            </span>
          </button>
        </header>

        {/* Messages */}
        <main className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="max-w-4xl mx-auto space-y-3 sm:space-y-4">
            {/* Temporary Mode Banner */}
            {isTemporaryMode && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-2.5 sm:p-3 flex items-start gap-2">
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-orange-900">Temporary Chat Active</p>
                  <p className="text-xs text-orange-700 mt-1">
                    This chat will be deleted when you refresh the page or start a new chat.
                  </p>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 ${message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-800 border border-gray-200 shadow-sm'
                    }`}
                >
                  <p className="text-xs sm:text-sm leading-relaxed break-words whitespace-pre-line">{message.content}</p>
                  <span
                    className={`text-xs mt-1 block ${message.role === 'user' ? 'text-blue-100' : 'text-gray-400'
                      }`}
                  >
                    {formatTime(message.timestamp)}
                  </span>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[85%] sm:max-w-[80%] rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 bg-white text-gray-800 border border-gray-200 shadow-sm">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Input */}
        <footer className="bg-white border-t border-gray-200 px-3 sm:px-4 py-3 sm:py-4 shadow-lg">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything..."
                disabled={isLoading}
                className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
              >
                Send
              </button>
            </form>
          </div>
        </footer>
      </div>
    </div>
  );
}