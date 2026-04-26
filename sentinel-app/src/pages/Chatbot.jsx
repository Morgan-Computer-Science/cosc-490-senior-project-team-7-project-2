import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import BriefingMessage from "../components/BriefingMessage";
import DomainCharts from "../components/DomainCharts";
import "./Chatbot.css";

const DOMAINS = [
  "Economy", "National Security", "Domestic Policy",
  "International Relations", "Military & Defense",
  "Jobs & Employment", "Trade & Commerce",
  "Energy & Environment", "Healthcare & Public Health",
  "Technology & Cybersecurity",
];

const HISTORY_KEY = "sentinel_briefing_history";
const MAX_HISTORY = 15;

function getTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function saveToHistory(domain, content) {
  try {
    const existing = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
    const entry = {
      id: Date.now(),
      domain,
      timestamp: new Date().toISOString(),
      preview: content.slice(0, 200),
      content,
    };
    const updated = [entry, ...existing].slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {}
}

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]"); } catch { return []; }
}

export default function Chatbot() {
  const location = useLocation();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [scenarioMode, setScenarioMode] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (initializedRef.current) return;
    const { domain, initialQuestion } = location.state || {};
    if (domain) {
      initializedRef.current = true;
      setSelectedDomain(domain);
      const question = initialQuestion || `Generate the daily ${domain} briefing for the President.`;
      sendMessageWithDomain(domain, [], question, false);
    }
  }, [location.state]);

  async function sendMessageWithDomain(domain, history, text, scenario) {
    const userMsg = { role: "user", content: text, time: getTime() };
    const newHistory = [...history, userMsg];
    setMessages(newHistory);
    setIsTyping(true);

    const botTime = getTime();
    setMessages((prev) => [...prev, { role: "bot", content: "", time: botTime }]);

    try {
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, messages: newHistory, scenarioMode: scenario }),
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
        buffer = lines.pop();

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
              updated[updated.length - 1] = { role: "bot", content: fullText, time: botTime };
              return updated;
            });
          } catch {}
        }
      }

      // Save the first bot briefing (the initial auto-generated one) to history
      if (newHistory.length === 1 && fullText) {
        saveToHistory(domain, fullText);
      }

      if (!fullText) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "bot", content: "No response received.", time: botTime };
          return updated;
        });
      }
    } catch (e) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "bot", content: `Error: ${e.message}`, time: botTime };
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
    sendMessageWithDomain(selectedDomain, messages, content, scenarioMode);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleInput = (e) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  const changeDomain = () => {
    setSelectedDomain(null);
    setMessages([]);
    setScenarioMode(false);
    initializedRef.current = false;
  };

  const openHistory = () => {
    setHistory(loadHistory());
    setShowHistory(true);
  };

  const loadHistoryEntry = (entry) => {
    setSelectedDomain(entry.domain);
    setMessages([
      { role: "user", content: `Load briefing from ${new Date(entry.timestamp).toLocaleDateString()}`, time: getTime() },
      { role: "bot", content: entry.content, time: getTime() },
    ]);
    setShowHistory(false);
    initializedRef.current = true;
  };

  const showEmpty = messages.length === 0 && !isTyping;

  return (
    <div className={`chat-root ${scenarioMode ? "scenario-active" : ""}`}>

      {/* ── Header ── */}
      <header className="chat-header">
        <button className="back-btn" onClick={() => navigate("/")}>← Home</button>

        <div className="chat-header-title">
          <span className="sentinel-label">SENTINEL</span>
          {selectedDomain && <span className="domain-badge">{selectedDomain}</span>}
          {scenarioMode && <span className="scenario-badge">⚡ SCENARIO</span>}
        </div>

        <div className="chat-header-actions">
          {selectedDomain && (
            <button
              className={`scenario-btn ${scenarioMode ? "scenario-btn--on" : ""}`}
              onClick={() => setScenarioMode((s) => !s)}
              title="Toggle What If scenario mode"
            >
              {scenarioMode ? "⚡ Scenario On" : "⚡ What If"}
            </button>
          )}
          <button className="history-btn" onClick={openHistory} title="Past briefings">
            History
          </button>
          {selectedDomain && (
            <button className="change-domain-btn" onClick={changeDomain}>Switch</button>
          )}
        </div>
      </header>

      {/* Live FRED chart strip — shown for any domain that has FRED series */}
      {selectedDomain && <DomainCharts domain={selectedDomain} />}

      {/* ── Messages ── */}
      <div className="chat-messages">

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
                    sendMessageWithDomain(d, [], `Generate the daily ${d} briefing for the President.`, false);
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
            <h3>Generating {selectedDomain} briefing…</h3>
          </div>
        )}

        {scenarioMode && messages.length > 0 && (
          <div className="scenario-banner">
            ⚡ SCENARIO SIMULATION MODE — Claude will analyze cascading consequences of hypotheticals
          </div>
        )}

        {messages.map((msg, i) => {
          if (msg.content === "") return null;
          return (
            <div key={i} className={`msg-row ${msg.role}`}>
              <div className={`msg-icon msg-icon--${msg.role}`}>
                {msg.role === "bot" ? "AI" : "YOU"}
              </div>
              <div className="msg-content">
                <div className={`msg-bubble ${msg.role === "bot" ? "msg-bubble--md" : ""}`}>
                  {msg.role === "bot"
                    ? <BriefingMessage content={msg.content} />
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
              <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
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
            placeholder={
              !selectedDomain ? "Select a domain first…"
              : scenarioMode ? "Describe a hypothetical scenario…"
              : `Ask about ${selectedDomain}…`
            }
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
          >↑</button>
        </div>
        <div className="input-footer">Enter to send · Shift+Enter for new line</div>
      </div>

      {/* ── History Modal ── */}
      {showHistory && (
        <div className="history-overlay" onClick={() => setShowHistory(false)}>
          <div className="history-modal" onClick={(e) => e.stopPropagation()}>
            <div className="history-modal-header">
              <h3>Past Briefings</h3>
              <button onClick={() => setShowHistory(false)}>✕</button>
            </div>
            {history.length === 0 ? (
              <p className="history-empty">No saved briefings yet. Generate a domain briefing and it will appear here.</p>
            ) : (
              <div className="history-list">
                {history.map((entry) => (
                  <button key={entry.id} className="history-entry" onClick={() => loadHistoryEntry(entry)}>
                    <div className="history-entry-domain">{entry.domain}</div>
                    <div className="history-entry-date">
                      {new Date(entry.timestamp).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </div>
                    <div className="history-entry-preview">{entry.preview}…</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
