import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { jsPDF } from "jspdf";
import "./Chatbot.css";

const DOMAINS = ["Economy", "National Security", "Domestic Policy", "International Relations", "Military & Defense", "Jobs & Employment", "Trade & Commerce"];

function getTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Chatbot() {
  const location = useLocation();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Auto-select domain and send initial question if navigated from homepage
  useEffect(() => {
    if (initializedRef.current) return;
    const { domain, initialQuestion } = location.state || {};
    if (domain) {
      initializedRef.current = true;
      setSelectedDomain(domain);
      const question = initialQuestion || `Generate the daily ${domain} briefing for the President.`;
      sendMessageWithDomain(domain, [], question);
    }
  }, [location.state]);

  async function sendMessageWithDomain(domain, history, text) {
    const userMsg = { role: "user", content: text, time: getTime() };
    const newHistory = [...history, userMsg];
    setMessages(newHistory);
    setIsTyping(true);

    // Add an empty bot message we'll stream into
    const botTime = getTime();
    setMessages((prev) => [...prev, { role: "bot", content: "", time: botTime }]);

    try {
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, messages: newHistory }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Server error" }));
        throw new Error(err.error || "Server error");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // keep incomplete line

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") break;
          try {
            const { text: chunk, error } = JSON.parse(payload);
            if (error) throw new Error(error);
            fullText += chunk;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                role: "bot",
                content: fullText,
                time: botTime,
              };
              return updated;
            });
          } catch {}
        }
      }

      // If nothing came through, show an error
      if (!fullText) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "bot",
            content: "No response received. Please try again.",
            time: botTime,
          };
          return updated;
        });
      }
    } catch (e) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "bot",
          content: `Error: ${e.message}`,
          time: botTime,
        };
        return updated;
      });
    } finally {
      setIsTyping(false);
    }
  }

  const sendMessage = (text) => {
    if (!selectedDomain) return;
    const content = (text || input).trim();
    if (!content || isTyping) return;
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    sendMessageWithDomain(selectedDomain, messages, content);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInput = (e) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  const changeDomain = () => {
    setSelectedDomain(null);
    setMessages([]);
    initializedRef.current = false;
  };

  const exportPDF = () => {
    if (!messages.length) return;
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

    write("TOP SECRET // SCI // NOFORN", 9, true, [160, 0, 0]);
    doc.line(margin, y + 1, pageW - margin, y + 1);
    y += 7;
    write(`SENTINEL — ${selectedDomain ?? "Intelligence"} Briefing`, 16, true);
    y += 2;
    write(new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }), 9, false, [80, 80, 80]);
    y += 8;

    messages.forEach((msg) => {
      if (!msg.content) return;
      if (y > 250) { doc.addPage(); y = 18; }
      write(msg.role === "bot" ? "SENTINEL" : "PRESIDENT", 9, true, msg.role === "bot" ? [30, 80, 200] : [20, 20, 20]);
      y += 1;
      write(msg.content.replace(/\*\*(.+?)\*\*/g, "$1").replace(/#{1,6}\s+/g, "").replace(/\*(.+?)\*/g, "$1"), 9);
      y += 5;
    });

    const total = doc.internal.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(160, 0, 0);
      doc.text("TOP SECRET // SCI // NOFORN", pageW / 2, 290, { align: "center" });
    }

    doc.save(`SENTINEL-${(selectedDomain ?? "Brief").replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const showEmpty = messages.length === 0 && !isTyping;

  return (
    <div className="chat-root">

      {/* ── Header ── */}
      <header className="chat-header">
        <button className="back-btn" onClick={() => navigate("/")}>
          ← Home
        </button>
        <div className="chat-header-title">
          <span className="sentinel-label">SENTINEL</span>
          {selectedDomain && <span className="domain-badge">{selectedDomain}</span>}
        </div>
        {selectedDomain && (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="change-domain-btn" onClick={exportPDF} disabled={!messages.length}>
              Export PDF
            </button>
            <button className="change-domain-btn" onClick={changeDomain}>
              Switch Domain
            </button>
          </div>
        )}
        {!selectedDomain && <div style={{ width: 120 }} />}
      </header>

      {/* ── Messages ── */}
      <div className="chat-messages">

        {/* Domain selection */}
        {!selectedDomain && (
          <div className="empty-state">
            <h3>Select a Policy Domain</h3>
            <p className="empty-sub">Choose a domain to receive your intelligence briefing</p>
            <div className="domain-grid">
              {DOMAINS.map((d) => (
                <button
                  key={d}
                  className="domain-pick-btn"
                  onClick={() => {
                    setSelectedDomain(d);
                    sendMessageWithDomain(d, [], `Generate the daily ${d} briefing for the President.`);
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedDomain && showEmpty && (
          <div className="empty-state">
            <div className="pulse-ring" />
            <h3>Generating {selectedDomain} briefing...</h3>
          </div>
        )}

        {messages.map((msg, i) => {
          // Skip the empty streaming placeholder — typing dots show instead
          if (msg.content === "") return null;
          return (
            <div key={i} className={`msg-row ${msg.role}`}>
              <div className={`msg-icon msg-icon--${msg.role}`}>
                {msg.role === "bot" ? "AI" : "YOU"}
              </div>
              <div className="msg-content">
                <div className={`msg-bubble ${msg.role === "bot" ? "msg-bubble--md" : ""}`}>
                  {msg.role === "bot"
                    ? <ReactMarkdown>{msg.content}</ReactMarkdown>
                    : msg.content}
                </div>
                <div className="msg-time">{msg.time}</div>
              </div>
            </div>
          );
        })}

        {isTyping && messages[messages.length - 1]?.content === "" && (
          <div className="msg-row bot">
            <div className="msg-icon msg-icon--bot">AI</div>
            <div className="typing-bubble">
              <div className="typing-dot" />
              <div className="typing-dot" />
              <div className="typing-dot" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ── */}
      <div className="chat-input-area">
        <div className="input-wrapper">
          <textarea
            ref={textareaRef}
            className="chat-input"
            placeholder={selectedDomain ? `Ask about ${selectedDomain}...` : "Select a domain first..."}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={!selectedDomain || isTyping}
          />
          <button
            className="send-btn"
            onClick={() => sendMessage()}
            disabled={!input.trim() || isTyping || !selectedDomain}
          >
            ↑
          </button>
        </div>
        <div className="input-footer">
          Enter to send · Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}
