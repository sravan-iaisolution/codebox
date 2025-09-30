import { useEffect } from "react";
import { highlightAll } from "prismjs";

import "prismjs/components/prism-javascript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-typescript";

import "./code-theme.css";

interface Props {
  code: string;
  lang: string;
}

export const CodeView: React.FC<Props> = ({ code, lang }) => {
  useEffect(() => {
    highlightAll();
  }, [code, lang]);

  return (
    <pre className="p-2 bg-transparent border-none rounded-none m-0 text-xs">
      <code className={`language-${lang}`}>{code}</code>
    </pre>
  );
};
