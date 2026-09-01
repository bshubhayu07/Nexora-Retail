import React, { useState, useRef, useEffect } from 'react';
import { sendCopilotChat } from '../../api/copilot';
import { useStore } from '../../context/StoreContext';
import { ChatMessage } from '../../types';
import { Bot, User, Send, Sparkles, Loader2, Database, ArrowRight } from 'lucide-react';

export const CopilotChat: React.FC = () => {
  const { setCurrentRoute } = useStore();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'assistant',
      text: "Hello! I am your **Qualcomm On-Device AI Retail Operations Copilot**.\n\nI have real-time access to live store footfall, checkout queues, aisle shelf capacities, and edge NPU telemetry. How can I assist with your store management shift?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isLiveLlama: true,
      modelName: 'llama3.2 (Qualcomm Local RAG)',
      sources: ['ShopperTelemetry', 'QueueMetric', 'ShelfMetric', 'QualcommEdgeHardware'],
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const suggestedPrompts = [
    'Why is Counter 1 congested right now?',
    'Which aisle needs urgent restocking?',
    "Summarize today's overall store operations.",
    'What is the current Qualcomm Edge AI hardware status?',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (queryToSend?: string) => {
    const query = (queryToSend || inputQuery).trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const response = await sendCopilotChat(query, true);

      // Check if response mentions specific queues or aisles for suggested cross-link
      let suggestedAction: ChatMessage['suggestedAction'] = undefined;
      const lower = query.toLowerCase();
      if (lower.includes('counter') || lower.includes('queue') || lower.includes('checkout')) {
        suggestedAction = { label: 'View Queue Intelligence', route: 'queues' };
      } else if (lower.includes('stock') || lower.includes('aisle') || lower.includes('shelf')) {
        suggestedAction = { label: 'View Inventory Intelligence', route: 'inventory' };
      } else if (lower.includes('hardware') || lower.includes('npu') || lower.includes('qualcomm')) {
        suggestedAction = { label: 'View System Diagnostics', route: 'diagnostics' };
      }

      const botMsg: ChatMessage = {
        id: Math.random().toString(36).substring(2, 9),
        sender: 'assistant',
        text: response.llama_response,
        timestamp: new Date(response.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isLiveLlama: response.is_live_llama,
        modelName: response.used_llm_model,
        sources: response.sources_used,
        suggestedAction,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: Math.random().toString(36).substring(2, 9),
        sender: 'assistant',
        text: `Unable to connect to Local Copilot: ${err.message || 'Service unreachable.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelName: 'Error',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 160px)',
        padding: 0,
        overflow: 'hidden',
      }}
    >
      {/* Copilot Header */}
      <div
        style={{
          padding: 'var(--space-md) var(--space-lg)',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-card-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--accent-qualcomm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}
          >
            <Sparkles size={16} />
          </div>
          <div>
            <h2 className="text-h2" style={{ fontSize: 14 }}>
              Qualcomm On-Device Retail Copilot
            </h2>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              LLaMA 3.2 edge inference with live telemetry RAG injection
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--priority-normal-text)' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--priority-normal-border)' }} />
          <span>Local Inference Ready</span>
        </div>
      </div>

      {/* Message Stream */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 'var(--space-lg)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-lg)',
        }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
              maxWidth: msg.sender === 'user' ? '80%' : '90%',
              alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            {msg.sender === 'assistant' && (
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-qualcomm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                <Bot size={15} />
              </div>
            )}

            <div
              style={{
                backgroundColor:
                  msg.sender === 'user'
                    ? 'var(--accent-primary)'
                    : 'var(--bg-surface-elevated)',
                border: '1px solid',
                borderColor:
                  msg.sender === 'user' ? 'transparent' : 'var(--border-default)',
                borderRadius: 'var(--radius-lg)',
                padding: '12px 16px',
                color: '#ffffff',
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              <div style={{ whiteSpace: 'pre-line' }}>{msg.text}</div>

              {/* Suggested Entity Action Cross-link */}
              {msg.suggestedAction && (
                <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border-subtle)' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setCurrentRoute(msg.suggestedAction!.route as any)}
                  >
                    <span>{msg.suggestedAction.label}</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              )}

              {/* RAG Metadata Footer */}
              {msg.sender === 'assistant' && msg.sources && (
                <div
                  style={{
                    marginTop: 8,
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 10,
                    color: 'var(--text-muted)',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Database size={10} /> Context Sources:
                  </span>
                  {msg.sources.map((src, i) => (
                    <span
                      key={i}
                      style={{
                        padding: '1px 6px',
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: 3,
                        fontFamily: 'var(--font-family-mono)',
                      }}
                    >
                      {src}
                    </span>
                  ))}
                  <span style={{ marginLeft: 'auto' }}>{msg.modelName}</span>
                </div>
              )}
            </div>

            {msg.sender === 'user' && (
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-secondary)',
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                <User size={15} />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                backgroundColor: 'var(--accent-qualcomm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
              }}
            >
              <Bot size={15} />
            </div>
            <div
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                padding: '10px 16px',
                borderRadius: 'var(--radius-lg)',
                fontSize: 13,
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Loader2 size={14} className="animate-spin" />
              <span>Analyzing live store telemetry with LLaMA 3.2...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div
        style={{
          padding: '8px var(--space-lg)',
          backgroundColor: 'var(--bg-card-subtle)',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          overflowX: 'auto',
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          Suggested Inquiries:
        </span>
        {suggestedPrompts.map((p, idx) => (
          <button
            key={idx}
            className="btn btn-ghost btn-sm"
            style={{
              fontSize: 11,
              whiteSpace: 'nowrap',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-card)',
            }}
            onClick={() => handleSend(p)}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div
        style={{
          padding: 'var(--space-md) var(--space-lg)',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-card)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-md)',
        }}
      >
        <input
          type="text"
          placeholder="Ask anything about current queues, stockout risks, footfall, or store recommendations..."
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={isLoading}
          style={{
            flex: 1,
            backgroundColor: 'var(--bg-input)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            color: 'var(--text-primary)',
            fontSize: 13,
            outline: 'none',
          }}
        />
        <button
          className="btn btn-primary"
          onClick={() => handleSend()}
          disabled={!inputQuery.trim() || isLoading}
        >
          <Send size={15} />
          <span>Ask Copilot</span>
        </button>
      </div>
    </div>
  );
};
