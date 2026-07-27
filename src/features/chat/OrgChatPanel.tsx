'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Send, X, MessagesSquare } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  chatApi,
  socketPayloadToMessage,
  useGetChatMessagesQuery,
  useSendChatMessageMutation,
  type ChatMessageSocketPayload,
} from '@/features/chat/chatApi';
import { useGetMeQuery } from '@/features/auth/meApi';
import { getSocket } from '@/lib/socket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import type { AppDispatch } from '@/lib/store';

interface OrgChatPanelProps {
  orgId: string;
  orgName?: string;
  onClose?: () => void;
}

// "Yaziyor..." bilgisi bu sure boyunca gelmezse kullaniciyi listeden dusur
const TYPING_TIMEOUT_MS = 3000;
// Tus basina degil, bu araliklarla typing event'i gonder
const TYPING_THROTTLE_MS = 1500;

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function initials(name?: string): string {
  if (!name) return '?';
  return (
    name
      .split(' ')
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  );
}

export const OrgChatPanel: React.FC<OrgChatPanelProps> = ({ orgId, orgName, onClose }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { data: me } = useGetMeQuery();
  const { data: messages = [], isLoading } = useGetChatMessagesQuery(orgId);
  const [sendChatMessage, { isLoading: isSending }] = useSendChatMessageMutation();

  const [input, setInput] = useState('');
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});

  const bottomRef = useRef<HTMLDivElement>(null);
  const lastTypingSentAt = useRef(0);
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Yeni mesaj geldikce en alta kaydir
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Realtime: yeni mesaj + "yaziyor..." dinleyicileri
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Davet sonrasi baglanan soketler org odasinda olmayabilir
    socket.emit('join:org', orgId);

    const handleMessage = (payload: ChatMessageSocketPayload) => {
      if (payload.organizationId !== orgId) return;

      // Socket yuku REST cevabiyla ayni sekle getirilmeli
      const message = socketPayloadToMessage(payload);
      dispatch(
        chatApi.util.updateQueryData('getChatMessages', orgId, (draft) => {
          if (!draft.some((m) => m.id === message.id)) draft.push(message);
        }),
      );
      // Mesaji yazan kisi artik yazmiyordur
      setTypingUsers((prev) => {
        if (!prev[payload.authorId]) return prev;
        const next = { ...prev };
        delete next[payload.authorId];
        return next;
      });
    };

    const handleTyping = (data: {
      organizationId: string;
      userId: string;
      userName: string;
      isTyping: boolean;
    }) => {
      if (data.organizationId !== orgId) return;
      if (data.userId === me?.id) return;

      clearTimeout(typingTimers.current[data.userId]);

      if (!data.isTyping) {
        setTypingUsers((prev) => {
          const next = { ...prev };
          delete next[data.userId];
          return next;
        });
        return;
      }

      setTypingUsers((prev) => ({ ...prev, [data.userId]: data.userName }));
      // Karsi taraf "durdum" event'ini gonderemeden kapanirsa diye guvenlik
      typingTimers.current[data.userId] = setTimeout(() => {
        setTypingUsers((prev) => {
          const next = { ...prev };
          delete next[data.userId];
          return next;
        });
      }, TYPING_TIMEOUT_MS);
    };

    socket.on('chat:message', handleMessage);
    socket.on('chat:typing', handleTyping);

    const timers = typingTimers.current;
    return () => {
      socket.off('chat:message', handleMessage);
      socket.off('chat:typing', handleTyping);
      Object.values(timers).forEach(clearTimeout);
    };
  }, [orgId, dispatch, me?.id]);

  const emitTyping = (isTyping: boolean) => {
    const socket = getSocket();
    socket?.emit('chat:typing', { organizationId: orgId, isTyping });
  };

  const handleInputChange = (value: string) => {
    setInput(value);

    const now = Date.now();
    if (value && now - lastTypingSentAt.current > TYPING_THROTTLE_MS) {
      lastTypingSentAt.current = now;
      emitTyping(true);
    }
    if (!value) {
      lastTypingSentAt.current = 0;
      emitTyping(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isSending) return;

    setInput('');
    lastTypingSentAt.current = 0;
    emitTyping(false);

    try {
      await sendChatMessage({ orgId, text }).unwrap();
    } catch {
      setInput(text); // yazdigi kaybolmasin
      toast.error('Mesaj gönderilemedi.');
    }
  };

  const typingText = useMemo(() => {
    const names = Object.values(typingUsers);
    if (names.length === 0) return '';
    if (names.length === 1) return `${names[0]} yazıyor...`;
    if (names.length === 2) return `${names[0]} ve ${names[1]} yazıyor...`;
    return 'Birkaç kişi yazıyor...';
  }, [typingUsers]);

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <MessagesSquare className="h-4 w-4 text-primary" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">Organizasyon Sohbeti</h3>
            {orgName && <p className="text-xs text-muted-foreground">{orgName}</p>}
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Sohbeti kapat">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {isLoading &&
          [0, 1, 2].map((i) => (
            <div key={i} className={`flex gap-2 ${i % 2 ? 'flex-row-reverse' : ''}`}>
              <Skeleton className="size-7 shrink-0 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className={`h-8 ${i % 2 ? 'w-2/5' : 'w-3/5'} rounded-lg`} />
              </div>
            </div>
          ))}

        {!isLoading && messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <span className="mb-3 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MessagesSquare className="size-5" />
            </span>
            <p className="text-sm font-medium text-foreground">Henüz mesaj yok</p>
            <p className="mt-1 text-xs text-muted-foreground">
              İlk mesajı sen yaz, ekipteki herkes anında görsün.
            </p>
          </div>
        )}

        {messages.map((message) => {
          const isMine = message.authorId === me?.id;
          return (
            <div
              key={message.id}
              className={`flex gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="text-[10px]">
                  {initials(message.author?.name)}
                </AvatarFallback>
              </Avatar>
              <div className={`max-w-[75%] ${isMine ? 'text-right' : 'text-left'}`}>
                <div className="mb-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span>{isMine ? 'Sen' : message.author?.name ?? 'Bilinmeyen kullanıcı'}</span>
                  <span>{formatTime(message.createdAt)}</span>
                </div>
                <div
                  className={`inline-block whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-sm ${
                    isMine
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  {message.text}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="h-5 px-4 text-xs italic text-muted-foreground">{typingText}</div>

      <form onSubmit={handleSend} className="flex gap-2 border-t border-border px-4 py-3">
        <Input
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          onBlur={() => emitTyping(false)}
          placeholder="Mesaj yaz..."
          maxLength={2000}
          className="flex-1"
        />
        <Button type="submit" size="icon" disabled={!input.trim() || isSending} aria-label="Gönder">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
};
