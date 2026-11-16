import type { MDXComponents } from "mdx/types";
import type { ReactNode } from "react";

/** The closing button of an article: `<Cta href="/check">Check an address</Cta>`. */
function Cta({ href, children }: { href: string; children: ReactNode }) {
  return (
    <div className="post-cta">
      <a href={href} className="btn-primary">
        {children}
      </a>
    </div>
  );
}

/** A quiet note under the text (the disclaimer): `<Note>text</Note>`. */
function Note({ children }: { children: ReactNode }) {
  return <div className="post-note">{children}</div>;
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return { Cta, Note, ...components };
}
