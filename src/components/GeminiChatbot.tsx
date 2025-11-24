'use client';

import { useState, useRef, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

const GeminiChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatWidth, setChatWidth] = useState(320); // Default width in pixels (80 = 20rem)
  const [chatHeight, setChatHeight] = useState(384); // Default height in pixels (96 = 24rem)
  const [textSize, setTextSize] = useState<'sm' | 'md' | 'lg'>('md'); // Default text size
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const { data: session } = useSession();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startResize = (e: React.MouseEvent | React.TouchEvent, direction: 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se') => {
    e.preventDefault();
    e.stopPropagation();

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    resizeStart.current = {
      x: clientX,
      y: clientY,
      width: chatWidth,
      height: chatHeight,
    };

    const handleMouseMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const currentY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;

      // Calculate deltas
      const deltaX = currentX - resizeStart.current.x;
      const deltaY = currentY - resizeStart.current.y;

      let newWidth = resizeStart.current.width;
      let newHeight = resizeStart.current.height;

      // Handle width changes
      if (direction === 'e' || direction === 'ne' || direction === 'se') {
        // Resizing from right side
        newWidth = Math.max(240, resizeStart.current.width + deltaX); // Minimum 240px width
      } else if (direction === 'w' || direction === 'nw' || direction === 'sw') {
        // Resizing from left side - adjust width and position
        newWidth = Math.max(240, resizeStart.current.width - deltaX);
      }

      // Handle height changes
      if (direction === 's' || direction === 'sw' || direction === 'se') {
        // Resizing from bottom
        newHeight = Math.max(200, resizeStart.current.height + deltaY); // Minimum 200px height
      } else if (direction === 'n' || direction === 'nw' || direction === 'ne') {
        // Resizing from top
        newHeight = Math.max(200, resizeStart.current.height - deltaY);
      }

      setChatWidth(newWidth);
      setChatHeight(newHeight);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchmove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchend', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('touchmove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchend', handleMouseUp);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Get assistant response
      const response = await fetch('/api/chat/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputValue,
          userRole: session?.user?.role,
          userId: session?.user?.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from Gemini');
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        content: data.response,
        role: 'assistant',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error getting Gemini response:', error);
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        content: 'Sorry, I encountered an error. Please try again.',
        role: 'assistant',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen && messages.length === 0) {
      // Add a welcome message when opening for the first time
      setMessages([
        {
          id: 'welcome-1',
          content: 'Hello! I\'m your HR assistant. How can I help you today?',
          role: 'assistant',
          timestamp: new Date(),
        },
        {
          id: 'welcome-2',
          content: 'I can help you with employee information, leave requests, payroll details, and other HR-related queries. What would you like to know?',
          role: 'assistant',
          timestamp: new Date(),
        }
      ]);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <div
          className="bg-white rounded-lg shadow-lg flex flex-col border border-gray-200 relative"
          style={{ width: `${chatWidth}px`, height: `${chatHeight}px` }}
        >
          <div className="bg-[#006837] text-white p-3 rounded-t-lg flex justify-between items-center">
            <h3 className={`font-medium ${
              textSize === 'sm' ? 'text-base' :
              textSize === 'lg' ? 'text-xl' : 'text-lg'
            }`}>HR Assistant</h3>
            <div className="flex items-center space-x-2">
              <div className="flex items-center">
                <button
                  onClick={() => setTextSize('sm')}
                  className={`text-xs px-1 ${textSize === 'sm' ? 'font-bold underline' : 'opacity-70'}`}
                  aria-label="Small text"
                >
                  S
                </button>
                <button
                  onClick={() => setTextSize('md')}
                  className={`text-sm px-1 mx-1 ${textSize === 'md' ? 'font-bold underline' : 'opacity-70'}`}
                  aria-label="Medium text"
                >
                  M
                </button>
                <button
                  onClick={() => setTextSize('lg')}
                  className={`text-base px-1 ${textSize === 'lg' ? 'font-bold underline' : 'opacity-70'}`}
                  aria-label="Large text"
                >
                  L
                </button>
              </div>
              <button
                onClick={toggleChat}
                className="text-white hover:text-gray-200 focus:outline-none ml-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`mb-3 p-2 rounded-lg max-w-[80%] ${
                  message.role === 'user'
                    ? 'ml-auto bg-[#006837] text-white rounded-br-none'
                    : 'mr-auto bg-gray-200 text-gray-800 rounded-bl-none'
                }`}
              >
                <div className={`
                  ${textSize === 'sm' ? 'text-sm' :
                    textSize === 'lg' ? 'text-lg' : 'text-base'}
                `}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      // Customize how different markdown elements are rendered
                      p: ({node, ...props}) => <p {...props} className="mb-2" />,
                      strong: ({node, ...props}) => <strong {...props} className="font-bold" />,
                      em: ({node, ...props}) => <em {...props} className="italic" />,
                      ul: ({node, ...props}) => <ul {...props} className="list-disc list-inside mb-2" />,
                      ol: ({node, ...props}) => <ol {...props} className="list-decimal list-inside mb-2" />,
                      li: ({node, ...props}) => <li {...props} className="ml-4" />,
                      code: ({node, ...props}) => <code {...props} className="bg-gray-100 px-1 rounded" />,
                      pre: ({node, ...props}) => <pre {...props} className="bg-gray-100 p-2 rounded my-2 overflow-x-auto" />,
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
                <div className={`
                  mt-1 ${message.role === 'user' ? 'text-green-100' : 'text-gray-500'}
                  ${textSize === 'sm' ? 'text-xs' :
                    textSize === 'lg' ? 'text-sm' : 'text-xs'}
                `}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="mr-auto mb-3 p-2 rounded-lg bg-gray-200 text-gray-800 rounded-bl-none max-w-[80%]">
                <div className="flex items-center">
                  <div className="h-2 w-2 bg-gray-500 rounded-full mr-1 animate-bounce"></div>
                  <div className="h-2 w-2 bg-gray-500 rounded-full mr-1 animate-bounce delay-75"></div>
                  <div className="h-2 w-2 bg-gray-500 rounded-full animate-bounce delay-150"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="p-3 border-t border-gray-200 bg-white">
            <div className="flex">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me about HR..."
                className={`flex-1 border border-gray-300 rounded-l-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#006837] ${
                  textSize === 'sm' ? 'text-sm' :
                  textSize === 'lg' ? 'text-lg' : 'text-base'
                }`}
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim()}
                className={`bg-[#006837] text-white px-4 py-2 rounded-r-lg font-medium ${
                  textSize === 'sm' ? 'text-sm' :
                  textSize === 'lg' ? 'text-lg' : 'text-base'
                } ${
                  isLoading || !inputValue.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#004B2E]'
                }`}
              >
                Send
              </button>
            </div>
            <p className={`text-gray-500 mt-1 text-center ${
              textSize === 'sm' ? 'text-xs' :
              textSize === 'lg' ? 'text-base' : 'text-sm'
            }`}>
              Powered by Gemini AI • Ask about leave, payroll, employee info, etc.
            </p>
          </div>

          {/* Resize handles */}
          {/* Bottom-right corner handle */}
          <div
            className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize bg-transparent"
            onMouseDown={(e) => startResize(e, 'se')}
            onTouchStart={(e) => startResize(e, 'se')}
          />
          {/* Right edge handle */}
          <div
            className="absolute top-0 right-0 w-2 h-full cursor-e-resize bg-transparent"
            onMouseDown={(e) => startResize(e, 'e')}
            onTouchStart={(e) => startResize(e, 'e')}
          />
          {/* Bottom edge handle */}
          <div
            className="absolute bottom-0 left-0 w-full h-2 cursor-s-resize bg-transparent"
            onMouseDown={(e) => startResize(e, 's')}
            onTouchStart={(e) => startResize(e, 's')}
          />
        </div>
      ) : (
        <button
          onClick={toggleChat}
          className="bg-[#006837] text-white p-4 rounded-full shadow-lg hover:bg-[#004B2E] transition-colors flex items-center justify-center"
          aria-label="Open chatbot"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default GeminiChatbot;