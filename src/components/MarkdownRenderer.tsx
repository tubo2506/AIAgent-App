import React, { useState } from 'react';
import { marked } from 'marked';
import { Copy, Check } from './icons';

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
}

// Clean common LaTeX / math notations that Gemini returns in technical documents
function cleanMathSyntax(text: string): string {
  if (!text) return '';
  return text
    .replace(/\$\\ge\$/gi, '≥')
    .replace(/\$\\ge\s*([^$]+)\$/gi, '≥ $1')
    .replace(/\$\\le\$/gi, '≤')
    .replace(/\$\\le\s*([^$]+)\$/gi, '≤ $1')
    .replace(/\$\\rightarrow\$/gi, '→')
    .replace(/\$\\leftarrow\$/gi, '←')
    .replace(/\$\\to\$/gi, '→')
    .replace(/\$\\times\$/gi, '×')
    .replace(/\$\\neq\$/gi, '≠')
    .replace(/\$\\approx\$/gi, '≈')
    .replace(/\$\\pm\$/gi, '±')
    .replace(/\$([a-zA-Z0-9.,_\s+\-*/=()]+)\$/g, '$1'); // Strip simple single-dollar wrappers
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  isStreaming = false,
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyCode = (index: number, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Split content into code blocks and normal markdown
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-1 leading-relaxed">
      {parts.map((part, index) => {
        // Handle code block
        if (part.startsWith('```') && part.endsWith('```')) {
          const lines = part.slice(3, -3).trim().split('\n');
          const language = lines[0]?.match(/^[a-zA-Z0-9_-]+$/) ? lines[0] : '';
          const code = language ? lines.slice(1).join('\n') : lines.join('\n');

          return (
            <div
              key={index}
              className="my-3 rounded-xl overflow-hidden border border-slate-700/80 bg-slate-950 text-slate-100 shadow-sm"
            >
              <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400 font-mono">
                <span className="font-semibold uppercase tracking-wider text-slate-300">
                  {language || 'code'}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyCode(index, code)}
                  className="flex items-center gap-1 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  {copiedIndex === index ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-medium">Đã chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Sao chép</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3.5 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed selection:bg-emerald-500/20">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        // Handle standard Markdown (Headings, Lists, Bold, Tables, etc.)
        const cleanedText = cleanMathSyntax(part);
        let parsedHtml = '';
        try {
          parsedHtml = marked.parse(cleanedText, { breaks: true, gfm: true }) as string;
        } catch {
          parsedHtml = cleanedText;
        }

        return (
          <div
            key={index}
            className="markdown-body"
            dangerouslySetInnerHTML={{ __html: parsedHtml }}
          />
        );
      })}

      {isStreaming && (
        <span className="inline-block w-2 h-4 ml-1 bg-blue-600 dark:bg-blue-400 animate-pulse align-middle rounded-xs" />
      )}
    </div>
  );
};
