import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Copy, Check, Code, Eye } from 'lucide-react';

interface MermaidViewerProps {
  code: string;
  id?: string;
}

export const MermaidViewer: React.FC<MermaidViewerProps> = ({ code, id = 'mermaid-chart' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    });

    if (containerRef.current && code) {
      setRenderError(null);
      const uniqueId = `${id}-${Math.random().toString(36).substring(2, 9)}`;
      
      try {
        mermaid.render(uniqueId, code).then(({ svg }) => {
          if (containerRef.current) {
            containerRef.current.innerHTML = svg;
          }
        }).catch((err) => {
          console.warn('Mermaid render warning:', err);
          setRenderError(String(err));
        });
      } catch (err) {
        setRenderError(String(err));
      }
    }
  }, [code, id]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-lg my-3">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800/80 border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400"></span>
          <span className="text-xs font-semibold text-slate-300 tracking-wide">Mermaid.js Diagram</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'preview' ? 'code' : 'preview')}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-700 rounded-md transition"
          >
            {viewMode === 'preview' ? <Code className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {viewMode === 'preview' ? 'Source' : 'Diagram'}
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-700 rounded-md transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 overflow-x-auto min-h-[140px] flex items-center justify-center">
        {viewMode === 'preview' ? (
          renderError ? (
            <div className="text-amber-400/90 text-xs font-mono p-3 bg-amber-950/30 rounded-lg border border-amber-800/40 w-full">
              <p className="font-semibold mb-1">Diagram Preview Rendering Notice</p>
              <pre className="whitespace-pre-wrap">{code}</pre>
            </div>
          ) : (
            <div ref={containerRef} className="w-full flex justify-center text-slate-100 [&_svg]:max-w-full" />
          )
        ) : (
          <pre className="w-full text-xs font-mono text-cyan-300 bg-slate-950 p-3 rounded-lg overflow-x-auto whitespace-pre">
            {code}
          </pre>
        )}
      </div>
    </div>
  );
};
