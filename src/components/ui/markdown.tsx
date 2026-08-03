'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

// Kullanici tarafindan yazilan markdown'i basar. react-markdown ham HTML'i
// VARSAYILAN OLARAK render etmez (rehype-raw eklenmedigi surece) ve tehlikeli
// URL semalarini (javascript:) kendisi temizler - bu yuzden ayrica bir
// sanitizasyon katmani eklenmedi. rehype-raw eklenirse bu not gecersiz olur.
export const Markdown: React.FC<{ children: string; className?: string }> = ({
  children,
  className,
}) => (
  <div
    className={cn(
      'text-sm leading-6 text-foreground',
      // Tipografi: prose eklentisi projede yok, gerekli ogeler tek tek
      // hedefleniyor. Bosluklar kart aciklamasi olcegine gore secildi.
      '[&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0',
      '[&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:text-base [&_h1]:font-semibold',
      '[&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-[0.9375rem] [&_h2]:font-semibold',
      '[&_h3]:mt-3 [&_h3]:mb-1.5 [&_h3]:text-sm [&_h3]:font-semibold',
      '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5',
      '[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5',
      '[&_li]:my-0.5',
      '[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2',
      '[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground',
      '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.8125em]',
      '[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3',
      '[&_pre_code]:bg-transparent [&_pre_code]:p-0',
      '[&_hr]:my-3 [&_hr]:border-border',
      // Tablolar dar modalda tasmasin diye kendi yatay kaydirmasinda
      '[&_table]:my-2 [&_table]:block [&_table]:w-full [&_table]:overflow-x-auto [&_table]:text-xs',
      '[&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:font-medium',
      '[&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1',
      '[&_input[type=checkbox]]:mr-1.5 [&_input[type=checkbox]]:align-middle',
      className,
    )}
  >
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Dis baglantilar yeni sekmede ve referrer sizdirmadan acilir.
        a: ({ ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
      }}
    >
      {children}
    </ReactMarkdown>
  </div>
);
