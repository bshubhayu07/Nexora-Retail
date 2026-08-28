import React, { useEffect, useState, useRef } from 'react';
import { MessageSquare, Send, Bot, AlertCircle } from 'lucide-react';

const ManagerCopilot = ({ data }) => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'On-device intelligence active. How can I assist you with store operations today?', meta: 'Local Ollama: 12ms' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  if (!data) return null;
  const { alerts } = data;

  const handleSend = (text) => {
    const userMsg = typeof text === 'string' ? text : input;
    if (!userMsg.trim()) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsTyping(true);

    // Simulated LLM Response
    setTimeout(() => {
      let response = "I'm monitoring the store. Everything looks within operational parameters.";
      
      const lowerMsg = userMsg.toLowerCase();

      if (lowerMsg.includes('shelf 3') || lowerMsg.includes('produce')) {
        const zone3 = data.zones.find(z => z.id === 'A3');
        response = `Shelf 3 (Produce) is currently ${zone3.status.toLowerCase()} at ${Math.floor(zone3.occupancy)}% capacity.`;
      } else if (lowerMsg.includes('summary') || lowerMsg.includes('footfall')) {
        const qAvg = (data.queueData.reduce((acc, q) => acc + q.count, 0) / data.queueData.length).toFixed(1);
        response = `In the last 10 minutes: Average queue length was ${qAvg}. Store health is ${data.healthStatus}.`;
      } else if (lowerMsg.includes('counter 4') || lowerMsg.includes('why')) {
        const currentQ = data.queueData[data.queueData.length - 1].count;
        response = `Predictive analytics indicate an incoming surge. Current queue is ${currentQ}, approaching the threshold of 5. Opening counter 4 prevents bottlenecking.`;
      } else if (lowerMsg.includes('zone') || lowerMsg.includes('busy') || lowerMsg.includes('busiest')) {
        response = "The busiest zone currently is Aisle 2 (Snacks). Footfall is moderate.";
      } else if (lowerMsg.includes('staff') || lowerMsg.includes('queue')) {
        const qCount = data.queueData[data.queueData.length - 1].count;
        if (qCount >= 4) {
          response = `Checkout queues are currently at ${qCount}. I recommend opening an additional counter.`;
        } else {
          response = `Current queue length is ${qCount}. Staffing levels are adequate.`;
        }
      } else if (lowerMsg.includes('stock') || lowerMsg.includes('empty')) {
        const lowStock = data.zones.filter(z => z.status !== 'STOCKED');
        if (lowStock.length > 0) {
          response = `We have low stock in: ${lowStock.map(z => z.name).join(', ')}. Restock tasks have been queued.`;
        } else {
          response = "All monitored zones are currently well-stocked.";
        }
      }

      setIsTyping(false);
      const latency = Math.floor(100 + Math.random() * 50);
      setMessages(prev => [...prev, { role: 'assistant', content: response, meta: `Local Ollama: ${latency}ms` }]);
    }, 800 + Math.random() * 500); // realistic typing delay
  };

  const quickActions = [
    "Shelf 3 restock status",
    "Why counter 4?",
    "Footfall summary"
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Live Alert Feed */}
      <div className="bg-panelDark p-5 rounded-xl border border-gray-800 flex flex-col h-[500px]">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="text-red-400" size={20} />
          <h3 className="font-semibold text-gray-200">Live AI Alerts</h3>
        </div>
        
        <div className="flex-grow overflow-y-auto pr-2 space-y-3 custom-scrollbar">
          {alerts.map((alert) => (
            <div key={alert.id} className="bg-edgeDark border border-gray-800 rounded-lg p-3 flex flex-col gap-2">
              <div className="text-xs font-mono text-gray-500 flex justify-between">
                <span>RAW TRIGGER</span>
                <span className="text-gray-400 bg-gray-900 px-2 py-0.5 rounded">{alert.message}</span>
              </div>
              <div className="h-px w-full bg-gray-800"></div>
              <div className="flex gap-2 items-start pt-1">
                <Bot size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-300">{alert.llmText}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Manager Chat */}
      <div className="bg-panelDark p-5 rounded-xl border border-gray-800 flex flex-col h-[500px]">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="text-blue-400" size={20} />
          <h3 className="font-semibold text-gray-200">Manager Copilot (Ollama)</h3>
        </div>

        <div className="flex-grow overflow-y-auto mb-4 pr-2 space-y-4 custom-scrollbar flex flex-col">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[85%] rounded-lg p-3 text-sm ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : 'bg-gray-800 text-gray-200 rounded-bl-none'
              }`}>
                {msg.content}
              </div>
              {msg.role === 'assistant' && msg.meta && (
                <span className="text-[10px] text-gray-500 mt-1 ml-1 font-mono">
                  {msg.meta}
                </span>
              )}
            </div>
          ))}
          {isTyping && (
             <div className="flex flex-col items-start">
               <div className="max-w-[85%] rounded-lg p-3 text-sm bg-gray-800 text-gray-200 rounded-bl-none flex gap-1">
                 <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></span>
                 <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-75"></span>
                 <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-150"></span>
               </div>
             </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Quick Action Chips */}
        <div className="flex flex-wrap gap-2 mb-3">
          {quickActions.map((action, i) => (
            <button 
              key={i}
              onClick={() => handleSend(action)} 
              className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-full transition-colors border border-gray-700 hover:border-gray-500"
            >
              {action}
            </button>
          ))}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }} className="relative mt-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the on-device copilot..."
            className="w-full bg-edgeDark border border-gray-700 rounded-lg py-3 pl-4 pr-12 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            disabled={isTyping}
          />
          <button 
            type="submit"
            className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 transition-colors ${!input.trim() || isTyping ? 'text-gray-600' : 'text-blue-400 hover:text-blue-300'}`}
            disabled={!input.trim() || isTyping}
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ManagerCopilot;
