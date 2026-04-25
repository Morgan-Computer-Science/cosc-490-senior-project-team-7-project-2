import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { jsPDF } from "jspdf";
import "./PDB.css";

const DOMAIN_ORDER = [
  "Economy",
  "National Security",
  "Domestic Policy",
  "International Relations",
  "Military & Defense",
  "Jobs & Employment",
  "Trade & Commerce",
];

function stripMarkdown(text) {
  return text
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/^- /gm, "• ");
}

export default function PDB() {
  const navigate = useNavigate();
  const [briefings, setBriefings] = useState({});
  const [domainDone, setDomainDone] = useState({});
  const [synthesisStarted, setSynthesisStarted] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const readerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function streamPDB() {
      try {
        const res = await fetch("/api/pdb/stream");
        if (!res.ok) throw new Error("Stream failed");
        const reader = res.body.getReader();
        readerRef.current = reader;
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          if (cancelled) break;
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop();

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6);
            if (payload === "[DONE]") { setIsComplete(true); break; }
            try {
              const msg = JSON.parse(payload);
              if (msg.type === "chunk") {
                setBriefings((prev) => ({
                  ...prev,
                  [msg.domain]: (prev[msg.domain] ?? "") + msg.text,
                }));
              } else if (msg.type === "domain_done") {
                setDomainDone((prev) => ({ ...prev, [msg.domain]: true }));
              } else if (msg.type === "synthesis_start") {
                setSynthesisStarted(true);
              }
            } catch {}
          }
        }
      } catch (e) {
        if (!cancelled) console.error("PDB stream error:", e);
      }
    }

    streamPDB();
    return () => {
      cancelled = true;
      readerRef.current?.cancel();
    };
  }, []);

  const exportPDF = () => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 14;
    const maxW = pageW - margin * 2;
    let y = 18;

    const write = (text, size = 10, bold = false, color = [20, 20, 20]) => {
      doc.setFontSize(size);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setTextColor(...color);
      doc.splitTextToSize(String(text), maxW).forEach((line) => {
        if (y > 278) { doc.addPage(); y = 18; }
        doc.text(line, margin, y);
        y += size * 0.45;
      });
    };

    // Classification header
    write("TOP SECRET // SCI // NOFORN", 9, true, [160, 0, 0]);
    doc.setDrawColor(160, 0, 0);
    doc.line(margin, y + 1, pageW - margin, y + 1);
    y += 7;

    write("PRESIDENTIAL DAILY BRIEF", 20, true, [10, 10, 10]);
    y += 2;
    write(
      `SENTINEL Intelligence System  |  ${new Date().toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      })}`,
      9, false, [80, 80, 80]
    );
    y += 10;

    [...DOMAIN_ORDER, "Cross-Domain Analysis"].forEach((domain) => {
      const content = briefings[domain];
      if (!content) return;
      if (y > 250) { doc.addPage(); y = 18; }

      write(domain.toUpperCase(), 12, true, [10, 10, 10]);
      y += 1;
      doc.setDrawColor(180, 180, 180);
      doc.line(margin, y, pageW - margin, y);
      y += 5;
      write(stripMarkdown(content), 9);
      y += 8;
    });

    // Footer on every page
    const total = doc.internal.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(160, 0, 0);
      doc.text("TOP SECRET // SCI // NOFORN", pageW / 2, 290, { align: "center" });
      doc.setTextColor(130, 130, 130);
      doc.text(`Page ${i} of ${total}`, pageW - margin, 290, { align: "right" });
    }

    doc.save(`SENTINEL-PDB-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const doneCount = Object.keys(domainDone).length;
  const totalDomains = DOMAIN_ORDER.length;

  return (
    <div className="pdb-root">
      <header className="pdb-header">
        <button className="pdb-back" onClick={() => navigate("/")}>← Home</button>
        <div className="pdb-header-center">
          <span className="pdb-classification">TOP SECRET // SCI // NOFORN</span>
          <h1 className="pdb-title">Presidential Daily Brief</h1>
          <span className="pdb-date">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long", year: "numeric", month: "long", day: "numeric",
            })}
          </span>
        </div>
        <button className="pdb-export-btn" onClick={exportPDF} disabled={!isComplete}>
          {isComplete ? "Export PDF" : `${doneCount}/${totalDomains} agents...`}
        </button>
      </header>

      <div className="pdb-grid">
        {DOMAIN_ORDER.map((domain) => (
          <div
            key={domain}
            className={`pdb-card ${domainDone[domain] ? "pdb-card--done" : "pdb-card--generating"}`}
          >
            <div className="pdb-card-header">
              <span className="pdb-card-title">{domain}</span>
              <span className={`pdb-status-badge ${domainDone[domain] ? "badge--done" : "badge--gen"}`}>
                {domainDone[domain] ? "COMPLETE" : "GENERATING"}
              </span>
            </div>
            <div className="pdb-card-body">
              {briefings[domain] ? (
                <ReactMarkdown>{briefings[domain]}</ReactMarkdown>
              ) : (
                <div className="pdb-typing">
                  <div className="pdb-dot" /><div className="pdb-dot" /><div className="pdb-dot" />
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Cross-domain synthesis — spans full width */}
        <div
          className={`pdb-card pdb-card--synthesis ${
            isComplete ? "pdb-card--done" : synthesisStarted ? "pdb-card--generating" : "pdb-card--waiting"
          }`}
        >
          <div className="pdb-card-header">
            <span className="pdb-card-title">Cross-Domain Analysis</span>
            <span className={`pdb-status-badge ${
              isComplete ? "badge--done" : synthesisStarted ? "badge--gen" : "badge--wait"
            }`}>
              {isComplete ? "COMPLETE" : synthesisStarted ? "ANALYZING" : "AWAITING ALL AGENTS"}
            </span>
          </div>
          <div className="pdb-card-body">
            {briefings["Cross-Domain Analysis"] ? (
              <ReactMarkdown>{briefings["Cross-Domain Analysis"]}</ReactMarkdown>
            ) : synthesisStarted ? (
              <div className="pdb-typing">
                <div className="pdb-dot" /><div className="pdb-dot" /><div className="pdb-dot" />
              </div>
            ) : (
              <p className="pdb-wait-text">
                Waiting for all domain agents to report in before cross-domain analysis begins...
              </p>
            )}
          </div>
        </div>
      </div>

      <footer className="pdb-footer">TOP SECRET // SCI // NOFORN</footer>
    </div>
  );
}
