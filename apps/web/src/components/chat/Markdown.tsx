import { Children, isValidElement, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

import { CodeBlock } from './CodeBlock';
import './Markdown.css';

function PreBlock({ children }: { children?: ReactNode }) {
  const child = Children.toArray(children)[0];
  if (!isValidElement<{ className?: string; children?: ReactNode }>(child)) {
    return <pre>{children}</pre>;
  }
  const className = child.props.className ?? '';
  const language = /language-([\w+#.-]+)/.exec(className)?.[1] ?? '';
  const code = String(child.props.children ?? '').replace(/\n$/, '');
  return <CodeBlock code={code} language={language} />;
}

const components: Components = {
  pre: PreBlock,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer noopener">
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="md-table">
      <table>{children}</table>
    </div>
  ),
};

/** Safe GFM markdown for assistant replies (raw HTML is dropped). */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="md" data-testid="bee-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize]]}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
