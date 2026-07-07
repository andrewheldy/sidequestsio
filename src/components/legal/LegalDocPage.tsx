import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { slugify } from "@/lib/slugify";

/** Flattens heading children into plain text so it can be slugified for anchor IDs. */
function textContent(children: ReactNode): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(textContent).join("");
  if (
    children &&
    typeof children === "object" &&
    "props" in children &&
    (children as { props?: { children?: ReactNode } }).props?.children
  ) {
    return textContent((children as { props: { children: ReactNode } }).props.children);
  }
  return "";
}

function headingComponent(Tag: "h2" | "h3", className: string): Components[typeof Tag] {
  return ({ children, node: _node, ...props }) => (
    <Tag id={slugify(textContent(children))} className={className} {...props}>
      {children}
    </Tag>
  );
}

/** Smooth-scrolls to an in-page section. Native anchor-jump isn't dependable
 * inside an SPA route (the id may not exist yet on first paint, and some
 * input paths don't trigger the browser's default fragment behavior at all),
 * so TOC links are handled explicitly instead. */
function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

const components: Components = {
  h1: ({ children, node: _node, ...props }) => (
    <h1 className="text-3xl font-bold mb-2" {...props}>
      {children}
    </h1>
  ),
  h2: headingComponent("h2", "text-xl font-semibold mt-8 mb-3 scroll-mt-20"),
  h3: headingComponent("h3", "text-lg font-semibold mt-6 mb-2 scroll-mt-20"),
  p: ({ children, node: _node, ...props }) => (
    <p className="leading-relaxed" {...props}>
      {children}
    </p>
  ),
  a: ({ href = "", children, node: _node, ...props }) => {
    const className = "text-primary underline underline-offset-2 hover:no-underline";
    if (href.startsWith("#")) {
      const id = href.slice(1);
      return (
        <a
          href={href}
          className={className}
          onClick={(e) => {
            e.preventDefault();
            scrollToId(id);
            window.history.pushState(null, "", href);
          }}
          {...props}
        >
          {children}
        </a>
      );
    }
    if (href.startsWith("/")) {
      return (
        <Link to={href} className={className}>
          {children}
        </Link>
      );
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className} {...props}>
        {children}
      </a>
    );
  },
  blockquote: ({ children, node: _node, ...props }) => (
    <blockquote
      className="my-4 rounded-lg border-l-4 border-primary bg-primary/5 px-4 py-3 text-sm not-italic [&_p]:my-1"
      {...props}
    >
      {children}
    </blockquote>
  ),
  table: ({ children, node: _node, ...props }) => (
    <div className="my-4 overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm" {...props}>
        {children}
      </table>
    </div>
  ),
  th: ({ children, node: _node, ...props }) => (
    <th className="border-b border-border bg-muted/50 px-3 py-2 text-left font-semibold" {...props}>
      {children}
    </th>
  ),
  td: ({ children, node: _node, ...props }) => (
    <td className="border-b border-border/50 px-3 py-2 align-top" {...props}>
      {children}
    </td>
  ),
};

interface LegalDocPageProps {
  /** Used for the browser tab title; the doc's own H1 is what's visually displayed. */
  title: string;
  content: string;
}

export default function LegalDocPage({ title, content }: LegalDocPageProps) {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} · SideQuests`;
    return () => {
      document.title = previous;
    };
  }, [title]);

  // Deep links (e.g. a shared /privacy#13-data-deletion URL) — jump to the
  // section once its content has rendered, since ScrollToTop resets to (0,0)
  // on route mount before this runs.
  useEffect(() => {
    if (window.location.hash) scrollToId(window.location.hash.slice(1));
  }, [content]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to SideQuests
        </Link>

        <article className="prose prose-sm sm:prose-base max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
            {content}
          </ReactMarkdown>
        </article>
      </div>
    </div>
  );
}
