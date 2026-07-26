'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSendAiMessageMutation, useGetAiInsightsQuery } from '@/features/ai/aiApi';
import { X, Send, Loader2, Bot, Lightbulb, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  id: string;
}

interface AIChatPanelProps {
  projectId: string;
  projectName?: string;
  onClose?: () => void;
  isMobile?: boolean;
}

export const AIChatPanel: React.FC<AIChatPanelProps> = ({ projectId, projectName, onClose, isMobile }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Merhaba! 👋 Proje hakkında sorularınızı cevaplayabilirim. Örneğin:\n\n• "Bu projede neler yapılıyor?"\n• "Kartları nasıl daha iyi organize edebilirim?"\n• "Takım üyelerinin iş yükü nasıl?"`,
      id: 'welcome',
    },
  ]);
  const [input, setInput] = useState('');
  const [tab, setTab] = useState<'chat' | 'insights'>('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [sendMessage, { isLoading }] = useSendAiMessageMutation();
  const { data: insights, isLoading: insightsLoading } = useGetAiInsightsQuery(projectId, { skip: tab !== 'insights' });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (tab === 'chat') inputRef.current?.focus();
  }, [tab]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput('');
    const userMsg: Message = { role: 'user', content: text, id: `user-${Date.now()}` };
    setMessages((prev) => [...prev, userMsg]);

    const apiMessages = [
      ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: text },
    ];

    try {
      const reply = await sendMessage({ projectId, messages: apiMessages }).unwrap();
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: reply, id: `assistant-${Date.now()}` },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '⚠️ Mesaj gönderilirken bir hata oluştu. Lütfen tekrar deneyin.',
          id: `error-${Date.now()}`,
        },
      ]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  return (
    <div className={`flex flex-col bg-background border-l ${isMobile ? 'fixed inset-0 z-50' : 'h-full rounded-r-xl border'}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-primary/10 text-primary text-xs">AI</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-sm font-semibold">AI Asistan</h3>
            {projectName && (
              <p className="text-xs text-muted-foreground truncate max-w-[180px]">{projectName}</p>
            )}
          </div>
        </div>
        {isMobile && onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} title="Kapat">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Tab Bar */}
      <div className="flex border-b shrink-0">
        <button
          onClick={() => setTab('chat')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
            tab === 'chat' ? 'text-foreground border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Sohbet
        </button>
        <button
          onClick={() => setTab('insights')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
            tab === 'insights' ? 'text-foreground border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Lightbulb className="h-3.5 w-3.5" />
          İçgörüler
        </button>
      </div>

      {/* Tab Content */}
      {tab === 'chat' ? (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 group ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <Avatar className="h-7 w-7 mt-1">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">AI</AvatarFallback>
                  </Avatar>
                )}
                <div className="relative">
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-muted rounded-tl-sm'
                    }`}
                  >
                    {msg.content.split('\n').map((line, i) => (
                      <React.Fragment key={i}>
                        {line}
                        {i < msg.content.split('\n').length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </div>
                  {msg.role === 'assistant' && msg.id !== 'welcome' && (
                    <button
                      onClick={() => handleCopy(msg.content)}
                      className="absolute -bottom-4 right-0 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-muted-foreground hover:text-foreground bg-background px-1 rounded border"
                      title="Kopyala"
                    >
                      Kopyala
                    </button>
                  )}
                </div>
                {msg.role === 'user' && (
                  <Avatar className="h-7 w-7 mt-1">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">U</AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2 items-center text-muted-foreground">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">AI</AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2.5">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t p-3 shrink-0">
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Mesajınızı yazın..."
                disabled={isLoading}
                className="flex-1 rounded-full"
              />
              <Button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                size="icon"
                className="rounded-full shrink-0"
                title="Gönder"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 text-center">
              AI cevapları yönlendirme amaçlıdır, aksiyon almadan önce doğrulayın.
            </p>
          </div>
        </>
      ) : (
        /* Insights Tab */
        <div className="flex-1 overflow-y-auto p-4">
          {insightsLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">Proje analiz ediliyor...</p>
            </div>
          ) : insights ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="gap-1">
                  <Lightbulb className="h-3 w-3" />
                  AI Analizi
                </Badge>
              </div>
              <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed">
                {insights.split('\n').map((line, i) => (
                  <React.Fragment key={i}>
                    {line}
                    {i < insights.split('\n').length - 1 && <br />}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-sm text-muted-foreground">
              <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>AI yapılandırılmamış veya içgörü alınamadı.</p>
              <p className="text-xs mt-1">.env dosyasında AI_API_KEY ayarlayın.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
