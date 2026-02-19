import { useState, useRef, useEffect } from "react";
import "./Chatbot.css";

const BOT_REPLIES = [
  "That's a great question! I'm here to assist you with anything you need — from answering questions to brainstorming ideas or writing code.",
  "Interesting! Let me think about that... I'd say the key insight here is to break it down into smaller parts and tackle each one methodically.",
  "Sure! Here's what I know about that topic. Feel free to ask me to go deeper on any aspect.",
  "I can definitely help with that. Let me put together a clear and concise response for you.",
];

function getTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = (text) => {
    const content = (text || input).trim();
    if (!content) return;

    setMessages((prev) => [...prev, { role: "user", content, time: getTime() }]);
    setInput("");

    if (textareaRef.current) textareaRef.current.style.height = "auto";

    setIsTyping(true);
    setTimeout(() => {
      const reply = BOT_REPLIES[Math.floor(Math.random() * BOT_REPLIES.length)];
      setIsTyping(false);
      setMessages((prev) => [...prev, { role: "bot", content: reply, time: getTime() }]);
    }, 1200 + Math.random() * 800);
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
        {showEmpty && (
          <div className="empty-state">
            <h3>How can I help you today?</h3>
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
            placeholder="Message Sentinel..."
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button
            className="send-btn"
            onClick={() => sendMessage()}
            disabled={!input.trim() || isTyping}
          >
            ↑
          </button>
        </div>
        <div className="input-footer">Press Enter to send · Shift+Enter for new line</div>
      </div>
    </div>
  );
}