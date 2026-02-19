import { useState, useRef, useEffect } from "react";
import "./Chatbot.css";

const GOVERNMENT_DOMAINS = {
  Economy:
    "The Economy domain covers fiscal policy, taxation, federal budgeting, inflation, employment, trade, and economic growth strategies implemented by the government.",
  NationalSecurity:
    "The National Security domain includes defense policy, homeland security, intelligence operations, cybersecurity, and military strategy to protect the country.",
  InternationalRelations:
    "The International Relations domain focuses on diplomacy, foreign policy, global alliances, treaties, international trade agreements, and geopolitical strategy.",
};

function getTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = (text) => {
    if (!selectedDomain) return;

    const content = (text || input).trim();
    if (!content) return;

    setMessages((prev) => [...prev, { role: "user", content, time: getTime() }]);
    setInput("");

    if (textareaRef.current) textareaRef.current.style.height = "auto";

    setIsTyping(true);
    setTimeout(() => {
      const reply = GOVERNMENT_DOMAINS[selectedDomain];
      setIsTyping(false);
      setMessages((prev) => [...prev, { role: "bot", content: reply, time: getTime() }]);
    }, 1000);
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
            <button
              onClick={() => {
                setSelectedDomain(null);
                setMessages([]);
              }}
            >
              Change Domain
            </button>
          </div>
        )}

        {/* DOMAIN SELECTION UI */}
        {!selectedDomain && (
          <div className="empty-state">
            <h3>Select a Policy Domain</h3>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "15px" }}>
              <button onClick={() => setSelectedDomain("Economy")}>Economy</button>
              <button onClick={() => setSelectedDomain("NationalSecurity")}>National Security</button>
              <button onClick={() => setSelectedDomain("InternationalRelations")}>International Relations</button>
            </div>
          </div>
        )}

        {selectedDomain && showEmpty && (
          <div className="empty-state">
            <h3>Ask me about {selectedDomain}</h3>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`msg-row ${msg.role}`}>
            <div className="msg-icon">{msg.role === "bot" ? "🤖" : "👤"}</div>
            <div>
              <div className="msg-bubble">{msg.content}</div>
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
            disabled={!selectedDomain}
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