import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./BriefingMessage.css";

const BLUF_HEADINGS = ["bottom line up front", "bluf", "summary", "situation summary"];

function parseSections(markdown) {
  const lines = markdown.split("\n");
  const sections = [];
  let current = { heading: null, lines: [] };

  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+)/);
    if (h2) {
      if (current.heading !== null || current.lines.some((l) => l.trim())) {
        sections.push({ heading: current.heading, content: current.lines.join("\n").trim() });
      }
      current = { heading: h2[1].trim(), lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.heading !== null || current.lines.some((l) => l.trim())) {
    sections.push({ heading: current.heading, content: current.lines.join("\n").trim() });
  }
  return sections;
}

function Section({ section, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);

  if (!section.heading) {
    return (
      <div className="bm-preamble">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{section.content}</ReactMarkdown>
      </div>
    );
  }

  return (
    <div className={`bm-section ${open ? "bm-section--open" : ""}`}>
      <button className="bm-header" onClick={() => setOpen((o) => !o)}>
        <span className="bm-title">{section.heading}</span>
        <span className="bm-chevron">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="bm-body">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{section.content}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

export default function BriefingMessage({ content }) {
  const sections = parseSections(content);
  const hasSections = sections.some((s) => s.heading);

  if (!hasSections) {
    return (
      <div className="bm-plain">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    );
  }

  return (
    <div className="bm-wrapper">
      {sections.map((section, i) => {
        const isBluf = section.heading
          ? BLUF_HEADINGS.includes(section.heading.toLowerCase())
          : false;
        return <Section key={i} section={section} defaultOpen={i === 0 || isBluf} />;
      })}
    </div>
  );
}
