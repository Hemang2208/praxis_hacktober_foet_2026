"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Bot,
  User,
  Loader2,
  MessageCircle,
  X,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Types
interface ChatMessage {
  role: "student" | "ai";
  content: string;
  timestamp: Date;
  messageId?: string;
}

interface FeedbackChatProps {
  feedbackId: string;
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  hasLoadedHistory: boolean;
}

export const FeedbackChat: React.FC<FeedbackChatProps> = ({
  feedbackId,
  isOpen,
  onToggle,
  className = ""
}) => {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null,
    hasLoadedHistory: false
  });
  
  const [currentMessage, setCurrentMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSentTimeRef = useRef<number>(0);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatState.messages]);

  // Load chat history when chat opens
  useEffect(() => {
    const loadHistory = async () => {
      if (isOpen && !chatState.hasLoadedHistory && feedbackId) {
        setChatState(prev => ({ ...prev, isLoading: true, error: null }));
        
        try {
          const response = await fetch(`/api/feedback-chat/${feedbackId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error('Failed to load chat history');
          }

          const data = await response.json();
          
          setChatState(prev => ({
            ...prev,
            messages: data.chat.messages || [],
            isLoading: false,
            hasLoadedHistory: true
          }));
        } catch (error) {
          console.error('Error loading chat history:', error);
          setChatState(prev => ({
            ...prev,
            error: 'Failed to load chat history',
            isLoading: false,
            hasLoadedHistory: true
          }));
        }
      }
    };
    
    loadHistory();
  }, [isOpen, feedbackId, chatState.hasLoadedHistory]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);



  const sendMessage = async () => {
    if (!currentMessage.trim() || isSending) return;

    // Prevent rapid successive messages
    const now = Date.now();
    if (now - lastSentTimeRef.current < 1000) {
      return;
    }
    lastSentTimeRef.current = now;

    const messageText = currentMessage.trim();
    setCurrentMessage("");
    setIsSending(true);

    // Add user message immediately
    const userMessage: ChatMessage = {
      role: "student",
      content: messageText,
      timestamp: new Date(),
      messageId: `student-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      error: null
    }));

    try {
      const response = await fetch(`/api/feedback-chat/${feedbackId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: messageText }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      
      // Replace with complete server response to avoid state corruption
      if (data.chat && data.chat.messages && Array.isArray(data.chat.messages)) {
        const validMessages = data.chat.messages.filter(msg => 
          msg && 
          typeof msg.role === 'string' && 
          typeof msg.content === 'string' &&
          msg.content.trim().length > 0
        );
        
        const processedMessages = validMessages
          .map((msg, idx) => ({
            ...msg,
            messageId: msg.messageId || `${msg.role}-${Date.now()}-${idx}`,
            timestamp: new Date(msg.timestamp || Date.now())
          }))
          .slice(-50); // Keep only last 50 messages to prevent memory issues
        
        setChatState(prev => ({
          ...prev,
          messages: processedMessages
        }));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setChatState(prev => ({
        ...prev,
        error: 'Failed to send message. Please try again.'
      }));
      
      // Remove the failed message
      setChatState(prev => ({
        ...prev,
        messages: prev.messages.slice(0, -1)
      }));
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearError = () => {
    setChatState(prev => ({ ...prev, error: null }));
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!isOpen) {
    return (
      <Button
        onClick={onToggle}
        className={`fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:scale-105 transition-transform ${className}`}
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 50 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 50 }}
      className={`fixed bottom-6 right-6 w-96 max-w-[calc(100vw-3rem)] h-[500px] max-h-[calc(100vh-3rem)] z-50 ${className}`}
    >
      <Card className="h-full flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <CardHeader className="flex-shrink-0 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bot className="h-5 w-5 text-blue-600" />
              Follow-up Questions
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-slate-600">
            Ask questions about your code feedback
          </p>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0 min-h-0">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto scrollbar-thin px-4 min-h-0">
            <div className="space-y-4 py-4 max-w-full min-h-full">
              {chatState.isLoading && chatState.messages.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                  <span className="ml-2 text-sm text-slate-500">Loading chat history...</span>
                </div>
              ) : chatState.messages.length === 0 ? (
                <div className="text-center py-8">
                  <Bot className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500 mb-2">No messages yet</p>
                  <p className="text-xs text-slate-400">
                    Ask me anything about your code feedback!
                  </p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {chatState.messages.map((message, index) => (
                    <motion.div
                      key={message.messageId || `${message.role}-${index}-${message.timestamp}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3 w-full max-w-full overflow-hidden ${
                        message.role === 'student' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {message.role === 'ai' && (
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <Bot className="h-4 w-4 text-blue-600" />
                          </div>
                        </div>
                      )}
                      
                      <div className={`flex-1 min-w-0 max-w-[calc(100%-3rem)] overflow-hidden ${
                        message.role === 'student' ? 'order-first' : ''
                      }`}>
                        <div className={`p-3 rounded-lg text-sm break-words overflow-wrap-anywhere word-break-break-word ${
                          message.role === 'student'
                            ? 'bg-blue-600 text-white ml-auto max-w-fit'
                            : 'bg-slate-100 text-slate-900'
                        }`}>
                          <p className="whitespace-pre-wrap break-words overflow-wrap-anywhere word-break-break-word">{message.content}</p>
                        </div>
                        <div className={`text-xs text-slate-400 mt-1 ${
                          message.role === 'student' ? 'text-right' : 'text-left'
                        }`}>
                          {formatTime(message.timestamp)}
                        </div>
                      </div>
                      
                      {message.role === 'student' && (
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center">
                            <User className="h-4 w-4 text-slate-600" />
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
              
              {isSending && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3 justify-start overflow-hidden"
                >
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-blue-600" />
                    </div>
                  </div>
                  <div className="bg-slate-100 text-slate-900 p-3 rounded-lg min-w-0 break-words">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </div>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Error Alert */}
          {chatState.error && (
            <div className="px-4 pb-2">
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {chatState.error}
                  <Button
                    variant="link"
                    className="h-auto p-0 ml-2 text-red-600 underline"
                    onClick={clearError}
                  >
                    Dismiss
                  </Button>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Input Area */}
          <div className="flex-shrink-0 p-4 border-t bg-slate-50">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a question about your feedback..."
                className="flex-1"
                disabled={isSending}
                maxLength={5000}
              />
              <Button
                onClick={sendMessage}
                disabled={!currentMessage.trim() || isSending}
                size="icon"
                className="flex-shrink-0"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {currentMessage.length > 4500 && (
              <div className="mt-2">
                <Badge variant="secondary" className="text-xs">
                  {5000 - currentMessage.length} characters remaining
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default FeedbackChat;