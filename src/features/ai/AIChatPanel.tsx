'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSendAiMessageMutation, useGetAiInsightsQuery } from '@/features/ai/aiApi';
import { X, Send, Loader2, Bot, Lightbulb, MessageSquare, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  id: string;
}

interface ChartDataPoint {
  label: string;
  value: number;
}

interface ChartConfig {
  type: 'bar' | 'pie' | 'line';
  title: string;
  data: ChartDataPoint[];
}

const InteractiveChart: React.FC<{ data: ChartConfig }> = ({ data }) => {
  const { type, title, data: points } = data;
  if (!points || points.length === 0) return null;

  const values = points.map((p) => p.value);
  const maxValue = Math.max(...values, 1);
  const totalValue = values.reduce((sum, v) => sum + v, 0);

  if (type === 'bar') {
    return (
      <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl p-3 my-2 shadow-sm font-sans not-prose">
        <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">{title}</h4>
        <div className="space-y-2.5">
          {points.map((p, idx) => {
            const pct = (p.value / maxValue) * 100;
            const colors = [
              'from-blue-500 to-indigo-500',
              'from-emerald-500 to-teal-500',
              'from-orange-500 to-amber-500',
              'from-rose-500 to-pink-500',
              'from-purple-500 to-violet-500',
            ];
            const gradient = colors[idx % colors.length];
            return (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-medium">
                  <span className="text-zinc-600 dark:text-zinc-400 truncate pr-2">{p.label}</span>
                  <span className="text-zinc-800 dark:text-zinc-200 font-bold shrink-0">{p.value}</span>
                </div>
                <div className="h-2 w-full bg-zinc-200/70 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-500 ease-out`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (type === 'pie') {
    const colors = [
      '#3B82F6',
      '#10B981',
      '#F59E0B',
      '#EF4444',
      '#8B5CF6',
      '#EC4899',
    ];

    // Her dilimin baslangic yuzdesini (kumulatif) render'dan ONCE hesapla.
    // Render sirasinda disaridaki bir degiskeni mutasyona ugratmak
    // (accumulatedPercent += ...) React'in saflik kuraliyla celisiyordu.
    const slices = points.map((p) => (p.value / totalValue) * 100);
    const cumulativeStarts = slices.reduce<number[]>((acc, pct, idx) => {
      acc.push(idx === 0 ? 0 : acc[idx - 1] + slices[idx - 1]);
      return acc;
    }, []);

    return (
      <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl p-3 my-2 shadow-sm font-sans flex flex-col items-center not-prose">
        <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2 w-full text-left">{title}</h4>
        <div className="flex items-center gap-4 w-full">
          <div className="relative h-20 w-20 shrink-0">
            <svg viewBox="0 0 36 36" className="h-full w-full transform -rotate-90">
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="currentColor" strokeWidth="3" className="text-zinc-200 dark:text-zinc-800" />
              {points.map((p, idx) => {
                const pct = slices[idx];
                const dashArray = `${pct} ${100 - pct}`;
                const dashOffset = 100 - cumulativeStarts[idx];
                return (
                  <circle
                    key={idx}
                    cx="18"
                    cy="18"
                    r="15.915"
                    fill="none"
                    stroke={colors[idx % colors.length]}
                    strokeWidth="3.2"
                    strokeDasharray={dashArray}
                    strokeDashoffset={dashOffset}
                    className="transition-all duration-500 ease-out"
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">Toplam</span>
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 -mt-1">{totalValue}</span>
            </div>
          </div>

          <div className="flex-1 space-y-1 text-[10px] max-h-24 overflow-y-auto pr-1">
            {points.map((p, idx) => (
              <div key={idx} className="flex items-center justify-between font-medium">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: colors[idx % colors.length] }} />
                  <span className="text-zinc-600 dark:text-zinc-400 truncate pr-1">{p.label}</span>
                </div>
                <span className="text-zinc-800 dark:text-zinc-200 font-bold shrink-0">
                  {p.value} ({Math.round((p.value / totalValue) * 100)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (type === 'line') {
    const height = 60;
    const width = 160;
    const padding = 10;
    
    const pointsCount = points.length;
    const xStep = pointsCount > 1 ? (width - padding * 2) / (pointsCount - 1) : 0;
    
    const coordinates = points.map((p, idx) => {
      const x = padding + idx * xStep;
      const y = height - padding - ((p.value) / maxValue) * (height - padding * 2);
      return { x, y, label: p.label, value: p.value };
    });

    let pathD = '';
    let areaD = `M ${coordinates[0]?.x || padding} ${height - padding}`;
    
    coordinates.forEach((c, idx) => {
      if (idx === 0) {
        pathD = `M ${c.x} ${c.y}`;
      } else {
        pathD += ` L ${c.x} ${c.y}`;
      }
      areaD += ` L ${c.x} ${c.y}`;
    });
    
    if (coordinates.length > 0) {
      areaD += ` L ${coordinates[coordinates.length - 1].x} ${height - padding} Z`;
    }

    return (
      <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl p-3 my-2 shadow-sm font-sans not-prose">
        <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">{title}</h4>
        <div className="flex flex-col gap-2">
          <div className="w-full">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              
              <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="currentColor" className="text-zinc-200/50 dark:text-zinc-800/50" strokeDasharray="2 2" />
              <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="currentColor" className="text-zinc-200/50 dark:text-zinc-800/50" />

              {coordinates.length > 0 && <path d={areaD} fill="url(#lineGrad)" />}

              {coordinates.length > 0 && (
                <path
                  d={pathD}
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all duration-500 ease-out"
                />
              )}

              {coordinates.map((c, idx) => (
                <circle
                  key={idx}
                  cx={c.x}
                  cy={c.y}
                  r="2.5"
                  fill="#3B82F6"
                  stroke="white"
                  strokeWidth="1"
                  className="hover:r-3.5 transition-all duration-200 cursor-pointer"
                >
                  <title>{`${c.label}: ${c.value}`}</title>
                </circle>
              ))}
            </svg>
          </div>

          <div className="flex justify-between text-[8px] font-medium text-zinc-500 dark:text-zinc-400 px-1 mt-1">
            {points.map((p, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <span className="truncate max-w-[32px]">{p.label}</span>
                <span className="font-bold text-zinc-700 dark:text-zinc-300 mt-0.5">{p.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

interface AIChatPanelProps {
  projectId: string;
  projectName?: string;
  onClose?: () => void;
  isMobile?: boolean;
}

export const AIChatPanel: React.FC<AIChatPanelProps> = ({ projectId, projectName, onClose, isMobile }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [tab, setTab] = useState<'chat' | 'insights'>('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [sendMessage, { isLoading }] = useSendAiMessageMutation();
  const { data: insights, isLoading: insightsLoading } = useGetAiInsightsQuery(projectId, { skip: tab !== 'insights' });

  // Load from localStorage on mount or when projectId changes
  useEffect(() => {
    const saved = localStorage.getItem(`ai-chat-messages-${projectId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      } catch (e) {
        console.error('Error loading AI chat messages:', e);
      }
    }
    // Fallback default welcome message
    setMessages([
      {
        role: 'assistant',
        content: `Merhaba! 👋 Proje hakkında sorularınızı cevaplayabilirim. Örneğin:\n\n- "Bu projede neler yapılıyor?"\n- "Kartları nasıl daha iyi organize edebilirim?"\n- "Takım üyelerinin iş yükü nasıl?"`,
        id: 'welcome',
      },
    ]);
  }, [projectId]);

  // Save to localStorage when messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`ai-chat-messages-${projectId}`, JSON.stringify(messages));
    }
  }, [messages, projectId]);

  const handleClearHistory = () => {
    if (window.confirm('Sohbet geçmişini temizlemek istediğinizden emin misiniz?')) {
      const welcomeMsg: Message = {
        role: 'assistant',
        content: `Merhaba! 👋 Proje hakkında sorularınızı cevaplayabilirim. Örneğin:\n\n- "Bu projede neler yapılıyor?"\n- "Kartları nasıl daha iyi organize edebilirim?"\n- "Takım üyelerinin iş yükü nasıl?"`,
        id: 'welcome',
      };
      setMessages([welcomeMsg]);
      localStorage.setItem(`ai-chat-messages-${projectId}`, JSON.stringify([welcomeMsg]));
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (tab === 'chat') inputRef.current?.focus({ preventScroll: true });
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
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={handleClearHistory} title="Sohbet geçmişini temizle">
            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive transition-colors" />
          </Button>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} title="Kapat">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
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
          Değerlendirme
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
                <div className={`relative flex flex-col max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed prose prose-sm dark:prose-invert ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-sm prose-strong:text-primary-foreground prose-code:text-primary-foreground'
                        : 'bg-muted rounded-tl-sm'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ className, children, ...props }) {
                            const match = /language-chart/.exec(className || '');
                            if (match) {
                              try {
                                const chartData = JSON.parse(String(children));
                                return <InteractiveChart data={chartData} />;
                              } catch (err) {
                                return (
                                  <code className={className} {...props}>
                                    {children}
                                  </code>
                                );
                              }
                            }
                            return (
                              <code className={className} {...props}>
                                {children}
                              </code>
                            );
                          }
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      msg.content
                    )}
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
            <p className="text-xs text-muted-foreground mt-1.5 text-center whitespace-normal break-words">
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
              <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed prose prose-sm dark:prose-invert">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ className, children, ...props }) {
                      const match = /language-chart/.exec(className || '');
                      if (match) {
                        try {
                          const chartData = JSON.parse(String(children));
                          return <InteractiveChart data={chartData} />;
                        } catch (err) {
                          return (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          );
                        }
                      }
                      return (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    }
                  }}
                >
                  {insights}
                </ReactMarkdown>
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
