import katex from 'katex';
import { memo, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import clsx from 'clsx';
import { parseFigureBlock } from '@study-helper/shared/content/lesson';

// Markdown + KaTeX. Raw HTML in markdown is never rendered (react-markdown default), so content
// from the AI or the shared bank can't inject markup. KaTeX runs with trust disabled.

function renderMath(tex: string, display: boolean): string {
  try {
    return katex.renderToString(tex, { displayMode: display, throwOnError: false, strict: 'ignore', trust: false, output: 'html' });
  } catch {
    return tex;
  }
}

function textOf(node: ReactNode): string {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(textOf).join('');
  return '';
}

const baseComponents: Components = {
  code({ className, children, ...rest }) {
    const cls = className ?? '';
    if (cls.includes('language-figure')) {
      const fig = parseFigureBlock(textOf(children).trim());
      return typeof fig === 'string' ? null : <Figure {...fig} />;
    }
    if (cls.includes('math-inline') || cls.includes('math-display')) {
      const display = cls.includes('math-display');
      return (
        <span
          className={clsx('math', display ? 'math-display block' : 'math-inline')}
          dangerouslySetInnerHTML={{ __html: renderMath(textOf(children), display) }}
        />
      );
    }
    return (
      <code className={className} {...rest}>
        {children}
      </code>
    );
  },
  pre({ children }) {
    // Display maths arrives as <pre><code class="math-display">; don't wrap it in <pre>.
    return <div>{children}</div>;
  },
  a({ href, children }) {
    const safe = href && /^(https?:|mailto:|\/)/.test(href) ? href : undefined;
    return (
      <a href={safe} target={safe?.startsWith('/') ? undefined : '_blank'} rel="noopener noreferrer" className="text-brand-700 underline dark:text-brand-300">
        {children}
      </a>
    );
  },
  img() {
    return null; // images in markdown aren't supported (figures use the dedicated field)
  },
};

export interface MarkdownProps {
  children: string;
  className?: string;
  inline?: boolean;
  /** Override renderers, e.g. to inject cloze inputs. */
  components?: Components;
}

export const Markdown = memo(function Markdown({ children, className, inline, components }: MarkdownProps) {
  const merged = { ...baseComponents, ...components };
  if (inline) merged.p = ({ children: c }) => <>{c}</>;
  return (
    <div className={clsx('prose-study', inline && 'inline', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: true }]]} components={merged}>
        {children}
      </ReactMarkdown>
    </div>
  );
});

/** Renders a figure SVG safely as an image (scripts in SVG never execute in <img>). */
export function Figure({ svg, alt, caption }: { svg: string; alt: string; caption?: string }) {
  const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  return (
    <figure className="my-3">
      <img src={src} alt={alt} className="mx-auto max-h-80 max-w-full rounded-lg border border-line bg-white" />
      {caption && <figcaption className="mt-1 text-center text-sm text-muted">{caption}</figcaption>}
    </figure>
  );
}
