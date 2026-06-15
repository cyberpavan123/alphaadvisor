import { useState, useRef, useEffect } from "react";

const TABS = ["Analyze Stock/ETF", "Weekly Market Report", "Learn Options", "Portfolio Chat"];

const SYSTEM_PROMPT = `You are an elite investment advisor and financial analyst with deep expertise in:
- Fundamental analysis using SEC filings (10-K, 10-Q, 8-K)
- Balance sheet analysis: debt vs assets, leverage ratios
- Income statement analysis: revenue growth, profit margins, EBITDA
- Cash flow statement analysis
- ETF composition and expense ratio analysis
- Options strategies: covered calls, puts, spreads, Greeks
- Macro market trends and their business impact

When analyzing stocks/ETFs:
1. Break down financial health using these key metrics:
   - Debt-to-Asset ratio, Debt-to-Equity ratio
   - Revenue growth YoY, Gross Margin, Net Profit Margin, EBITDA margin
   - Current Ratio, Quick Ratio (liquidity)
   - Return on Equity (ROE), Return on Assets (ROA)
   - Free Cash Flow and Operating Cash Flow
2. Reference specific SEC filing data points when mentioned
3. Give a clear FINANCIAL HEALTH SCORE (1-10) with breakdown
4. Use structured sections with clear headers
5. Always end stock analysis with: Bull Case, Bear Case, and Key Risks

For weekly market reports:
- Cover macro trends, Fed policy, sector rotation
- Highlight which sectors/companies benefit or are at risk
- Mention global impact

For options education:
- Explain concepts clearly with real examples
- Cover Greeks (Delta, Gamma, Theta, Vega)
- Describe strategies: covered calls, protective puts, iron condors, spreads
- Always mention risk clearly

Format responses with clear sections using markdown-style headers (##) and bullet points. Be specific, data-driven, and educational.`;

// ─── Color palette & design tokens ───────────────────────────────────────────
const C = {
  bg: "#0a0e1a",
  surface: "#111827",
  surfaceAlt: "#1a2235",
  border: "#1e2d45",
  accent: "#00d4aa",
  accentDim: "#00a882",
  gold: "#f5c842",
  red: "#ff4d6d",
  green: "#22c55e",
  blue: "#3b82f6",
  text: "#e2e8f0",
  textMuted: "#64748b",
  textDim: "#94a3b8",
};

function formatMarkdown(text) {
  const lines = text.split("\n");
  const elements = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("## ")) {
      elements.push(
        <div key={key++} style={{ color: C.accent, fontWeight: 700, fontSize: 15, marginTop: 18, marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase", borderBottom: `1px solid ${C.border}`, paddingBottom: 4 }}>
          {line.replace("## ", "")}
        </div>
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <div key={key++} style={{ color: C.gold, fontWeight: 600, fontSize: 14, marginTop: 12, marginBottom: 4 }}>
          {line.replace("### ", "")}
        </div>
      );
    } else if (line.startsWith("- ") || line.startsWith("• ")) {
      const content = line.replace(/^[-•] /, "");
      elements.push(
        <div key={key++} style={{ display: "flex", gap: 8, marginBottom: 3, paddingLeft: 8 }}>
          <span style={{ color: C.accent, marginTop: 2, flexShrink: 0 }}>▸</span>
          <span style={{ color: C.textDim, fontSize: 13, lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: boldInline(content) }} />
        </div>
      );
    } else if (/^\d+\./.test(line)) {
      elements.push(
        <div key={key++} style={{ display: "flex", gap: 8, marginBottom: 3, paddingLeft: 8 }}>
          <span style={{ color: C.gold, minWidth: 20, fontSize: 13 }}>{line.match(/^\d+/)[0]}.</span>
          <span style={{ color: C.textDim, fontSize: 13, lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: boldInline(line.replace(/^\d+\.\s*/, "")) }} />
        </div>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={key++} style={{ height: 6 }} />);
    } else {
      elements.push(
        <p key={key++} style={{ color: C.textDim, fontSize: 13, lineHeight: 1.7, margin: "2px 0" }} dangerouslySetInnerHTML={{ __html: boldInline(line) }} />
      );
    }
  }
  return elements;
}

function boldInline(text) {
  return text.replace(/\*\*(.*?)\*\*/g, `<strong style="color:${C.text};font-weight:600">$1</strong>`);
}

function HealthBar({ score }) {
  const color = score >= 7 ? C.green : score >= 4 ? C.gold : C.red;
  return (
    <div style={{ margin: "12px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ color: C.textMuted, fontSize: 12 }}>Financial Health Score</span>
        <span style={{ color, fontWeight: 700, fontSize: 13 }}>{score}/10</span>
      </div>
      <div style={{ background: C.border, borderRadius: 4, height: 6, overflow: "hidden" }}>
        <div style={{ width: `${score * 10}%`, background: color, height: "100%", borderRadius: 4, transition: "width 0.8s ease" }} />
      </div>
    </div>
  );
}

function TabButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px",
        background: active ? C.accent : "transparent",
        color: active ? C.bg : C.textMuted,
        border: `1px solid ${active ? C.accent : C.border}`,
        borderRadius: 6,
        cursor: "pointer",
        fontSize: 12,
        fontWeight: active ? 700 : 500,
        transition: "all 0.2s",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 16 }}>
      {!isUser && (
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${C.accent}, ${C.blue})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, marginRight: 10, marginTop: 2 }}>
          📊
        </div>
      )}
      <div style={{
        maxWidth: "82%",
        background: isUser ? `linear-gradient(135deg, ${C.accent}22, ${C.blue}22)` : C.surfaceAlt,
        border: `1px solid ${isUser ? C.accent + "44" : C.border}`,
        borderRadius: isUser ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
        padding: "12px 16px",
      }}>
        {isUser
          ? <p style={{ color: C.text, fontSize: 13, margin: 0 }}>{msg.content}</p>
          : <div>{formatMarkdown(msg.content)}</div>
        }
      </div>
    </div>
  );
}

function ChatPanel({ systemContext, placeholder, quickPrompts }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text) => {
    const userMsg = text || input.trim();
    if (!userMsg || loading) return;
    setInput("");
    const newMessages = [...messages, { role: "user", content: userMsg }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: SYSTEM_PROMPT + "\n\nCurrent context: " + systemContext,
          messages: newMessages,
        }),
      });
      const data = await res.json();
      const reply = data.content?.find(b => b.type === "text")?.text || "Unable to get response.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Connection error. Please try again." }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 0 }}>
      {/* Quick prompts */}
      {messages.length === 0 && quickPrompts && (
        <div style={{ padding: "16px 0 8px" }}>
          <div style={{ color: C.textMuted, fontSize: 11, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Quick start</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {quickPrompts.map((p, i) => (
              <button key={i} onClick={() => send(p)} style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 20, padding: "5px 12px", color: C.textDim, fontSize: 11.5, cursor: "pointer" }}>
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0", minHeight: 0 }}>
        {messages.map((m, i) => <MessageBubble key={i} msg={m} />)}
        {loading && (
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${C.accent}, ${C.blue})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>📊</div>
            <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: "4px 16px 16px 16px", padding: "12px 16px", display: "flex", gap: 6, alignItems: "center" }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: C.accent, animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: 8, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder={placeholder}
          style={{ flex: 1, background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 13, outline: "none" }}
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          style={{ background: loading || !input.trim() ? C.border : C.accent, color: loading || !input.trim() ? C.textMuted : C.bg, border: "none", borderRadius: 8, padding: "10px 18px", cursor: loading || !input.trim() ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 13, transition: "all 0.2s" }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default function InvestmentAdvisor() {
  const [activeTab, setActiveTab] = useState(0);

  const tabContent = [
    {
      label: "Analyze Stock/ETF",
      icon: "📈",
      systemContext: "User wants deep fundamental analysis of stocks or ETFs using SEC filings, financial statements, debt vs asset analysis, revenue vs profit analysis.",
      placeholder: "Enter ticker + what to analyze, e.g. 'Analyze AAPL financials from latest 10-K'",
      quickPrompts: [
        "Analyze AAPL debt vs assets from latest 10-K",
        "Break down NVDA revenue vs profit margins",
        "Analyze SPY ETF composition and health",
        "Compare MSFT vs GOOGL financial health",
        "Analyze TSLA cash flow and liquidity ratios",
      ],
    },
    {
      label: "Weekly Market Report",
      icon: "🌐",
      systemContext: "User wants weekly market intelligence: macro trends, Fed policy, sector analysis, global business impact, earnings calendar, and what's moving markets.",
      placeholder: "Ask about market trends, sectors, or specific business news...",
      quickPrompts: [
        "Give me this week's macro market overview",
        "Which sectors are rotating into favor now?",
        "How will Fed rate decisions impact tech stocks?",
        "What global events should investors watch?",
        "Best performing sectors this week and why?",
      ],
    },
    {
      label: "Learn Options",
      icon: "🎯",
      systemContext: "User wants to learn options trading: Greeks, strategies (covered calls, puts, spreads, iron condors), risk management, and real examples.",
      placeholder: "Ask anything about options: strategies, Greeks, risk, examples...",
      quickPrompts: [
        "Explain covered calls with a real example",
        "What are the Greeks and why do they matter?",
        "How does a protective put work?",
        "Explain iron condor strategy",
        "What's the safest options strategy for beginners?",
      ],
    },
    {
      label: "Portfolio Chat",
      icon: "💼",
      systemContext: "User wants personalized portfolio analysis, stock screening advice, diversification guidance, and investment strategy discussion.",
      placeholder: "Describe your portfolio or ask about your investment strategy...",
      quickPrompts: [
        "How should I diversify a $10k portfolio?",
        "I hold AAPL, MSFT, NVDA — am I over-concentrated?",
        "What ETFs provide good sector exposure?",
        "How do I hedge my tech-heavy portfolio?",
        "Best dividend stocks for passive income?",
      ],
    },
  ];

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'Inter', 'Segoe UI', sans-serif", color: C.text, display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1)} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }
        input::placeholder { color: ${C.textMuted}; }
      `}</style>

      {/* Header */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "16px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg, ${C.accent}, ${C.blue})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
          📊
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 17, letterSpacing: "-0.02em" }}>
            AlphaAdvisor <span style={{ color: C.accent }}>Pro</span>
          </div>
          <div style={{ color: C.textMuted, fontSize: 11 }}>AI-powered investment analysis · SEC filings · Options education</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.green, boxShadow: `0 0 6px ${C.green}` }} />
          <span style={{ color: C.textMuted, fontSize: 11 }}>Live</span>
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{ background: "#1a1500", borderBottom: `1px solid #2a2000`, padding: "6px 24px", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12 }}>⚠️</span>
        <span style={{ color: "#a08020", fontSize: 11 }}>For educational purposes only. Not financial advice. Always consult a licensed financial advisor before investing.</span>
      </div>

      {/* Tabs */}
      <div style={{ padding: "12px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 8, overflowX: "auto" }}>
        {tabContent.map((t, i) => (
          <TabButton key={i} label={`${t.icon} ${t.label}`} active={activeTab === i} onClick={() => setActiveTab(i)} />
        ))}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: "16px 24px 20px", display: "flex", flexDirection: "column", minHeight: 0, height: "calc(100vh - 160px)" }}>
        <ChatPanel
          key={activeTab}
          systemContext={tabContent[activeTab].systemContext}
          placeholder={tabContent[activeTab].placeholder}
          quickPrompts={tabContent[activeTab].quickPrompts}
        />
      </div>
    </div>
  );
}
