import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="markdown-renderer">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]} // GitHub Flavored Markdown support
        rehypePlugins={[rehypeRaw]} // Allow HTML in markdown
        components={{
          // Custom handling for code blocks
          code: ({ node, inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';

            // For inline code (not code blocks)
            if (inline) {
              return (
                <code className="bg-[#2a2a2a] px-1 py-0.5 rounded text-sm font-mono text-nvidia-green" {...props}>
                  {children}
                </code>
              );
            }

            // Convert the code content to string
            const codeContent = String(children).replace(/\n$/, '');
            
            // For code blocks, apply syntax highlighting
            return (
              <div className="relative group my-4">
                <div className="flex justify-between items-center bg-[#1E1E1E] px-4 py-2 text-sm rounded-t text-gray-300 font-mono">
                  <span>{language || 'code'}</span>
                  <CopyButton code={codeContent} />
                </div>
                <SyntaxHighlighter
                  language={language || 'text'}
                  style={vscDarkPlus}
                  customStyle={{
                    margin: 0,
                    borderTopLeftRadius: 0,
                    borderTopRightRadius: 0,
                    borderBottomLeftRadius: '0.25rem',
                    borderBottomRightRadius: '0.25rem',
                  }}
                >
                  {codeContent}
                </SyntaxHighlighter>
              </div>
            );
          },
          
          // Custom handling for headings
          h1: ({ node, ...props }) => <h1 className="text-2xl font-bold my-4" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-xl font-bold my-3" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-lg font-bold my-2" {...props} />,
          h4: ({ node, ...props }) => <h4 className="text-base font-bold my-2" {...props} />,
          
          // Custom handling for paragraphs
          p: ({ node, ...props }) => <p className="my-2" {...props} />,
          
          // Custom handling for links
          a: ({ node, ...props }) => (
            <a 
              className="text-nvidia-green hover:underline" 
              target="_blank" 
              rel="noopener noreferrer" 
              {...props} 
            />
          ),
          
          // Custom handling for lists
          ul: ({ node, ...props }) => <ul className="list-disc pl-6 my-2" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal pl-6 my-2" {...props} />,
          
          // Custom handling for blockquotes
          blockquote: ({ node, ...props }) => (
            <blockquote 
              className="border-l-4 border-nvidia-green pl-4 italic my-4 text-gray-300" 
              {...props} 
            />
          ),
          
          // Custom handling for tables
          table: ({ node, ...props }) => (
            <div className="overflow-auto my-4">
              <table className="min-w-full divide-y divide-gray-700" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => <thead className="bg-[#2a2a2a]" {...props} />,
          tbody: ({ node, ...props }) => <tbody className="divide-y divide-gray-700" {...props} />,
          tr: ({ node, ...props }) => <tr className="hover:bg-[#2a2a2a]" {...props} />,
          th: ({ node, ...props }) => (
            <th 
              className="px-4 py-2 text-left text-sm font-medium text-gray-300" 
              {...props} 
            />
          ),
          td: ({ node, ...props }) => <td className="px-4 py-2 text-sm" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

// Component for the copy button in code blocks
const CopyButton: React.FC<{ code: string }> = ({ code }) => {
  const [copied, setCopied] = React.useState(false);
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  return (
    <Button 
      variant="ghost" 
      size="icon" 
      className="h-6 w-6 text-gray-400 hover:text-white"
      onClick={handleCopy}
      title={copied ? "Copied!" : "Copy to clipboard"}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
};

export default MarkdownRenderer;