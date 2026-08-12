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
      theme: 'default',
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
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden my-3">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-medium text-gray-700 tracking-wide">Mermaid.js Diagram</span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'preview' ? 'code' : 'preview')}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition"
          >
            {viewMode === 'preview' ? <Code className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {viewMode === 'preview' ? 'Source' : 'Diagram'}
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 overflow-x-auto min-h-[140px] flex items-center justify-center">
        {viewMode === 'preview' ? (
          renderError ? (
            <div className="text-amber-800 text-xs font-mono p-3 bg-amber-50 rounded-md border border-amber-200 w-full">
              <p className="font-semibold mb-1">Diagram Preview Rendering Notice</p>
              <pre className="whitespace-pre-wrap">{code}</pre>
            </div>
          ) : (
            <div ref={containerRef} className="w-full flex justify-center text-gray-800 [&_svg]:max-w-full" />
          )
        ) : (
          <pre className="w-full text-xs font-mono text-gray-800 bg-gray-50 border border-gray-200 p-3 rounded-md overflow-x-auto whitespace-pre">
            {code}
          </pre>
        )}
      </div>
    </div>
  );
};
