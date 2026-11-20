import { Fragment, type ReactNode } from 'react';

/** Minimal inline markup: **bold** and `code`. */
export function Rich({ text }: { text: string }) {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(<Fragment key={i++}>{text.slice(last, m.index)}</Fragment>);
    const tok = m[0];
    if (tok.startsWith('**')) out.push(<mark key={i++}>{tok.slice(2, -2)}</mark>);
    else out.push(<code key={i++}>{tok.slice(1, -1)}</code>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(<Fragment key={i++}>{text.slice(last)}</Fragment>);
  return <>{out}</>;
}
