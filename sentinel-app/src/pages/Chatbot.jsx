import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import "./Chatbot.css";

const DOMAINS = ["Economy", "National Security", "Domestic Policy", "International Relations"];

function getTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Chatbot() {
  const location = useLocation();
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

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, messages: newHistory }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Server error" }));
        throw new Error(err.error || "Server error");
      }

      const data = await res.json();
      const botMsg = { role: "bot", content: data.reply, time: getTime() };
      setMessages((prev) => [...prev, botMsg]);
    } catch (e) {
      const errorMsg = { role: "bot", content: `Error: ${e.message}`, time: getTime() };
      setMessages((prev) => [...prev, errorMsg]);
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

  const showEmpty = messages.length === 0 && !isTyping;

  return (
    <div className="chat-root">
      <div className="chat-messages">

        {/* CHANGE DOMAIN BAR */}
        {selectedDomain && (
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.1)"
          }}>
            <span>
              Current Domain: <strong>{selectedDomain}</strong>
            </span>
            <button onClick={() => { setSelectedDomain(null); setMessages([]); initializedRef.current = false; }}>
              Change Domain
            </button>
          </div>
        )}

        {/* DOMAIN SELECTION UI */}
        {!selectedDomain && (
          <div className="empty-state">
            <h3>Select a Policy Domain</h3>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "15px", flexWrap: "wrap" }}>
              {DOMAINS.map((d) => (
                <button
                  key={d}
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
            <h3>Generating {selectedDomain} briefing...</h3>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`msg-row ${msg.role}`}>
            <div className="msg-icon">{msg.role === "bot" ? "🤖" : "👤"}</div>
            <div>
              <div className="msg-bubble" style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>
              <div className="msg-time">{msg.time}</div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="msg-row bot">
            <div className="msg-icon">🤖</div>
            <div className="typing-bubble">
              <div className="typing-dot" />
              <div className="typing-dot" />
              <div className="typing-dot" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <div className="input-wrapper">
          <textarea
            ref={textareaRef}
            className="chat-input"
            placeholder={selectedDomain ? "Message Sentinel..." : "Select a domain first..."}
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
          Press Enter to send · Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}
