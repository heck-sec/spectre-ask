"use client";

import { useRef, useState, useEffect } from "react";
import { 
  ChevronRight, 
  ChevronLeft, 
  Bot, 
  Sparkles, 
  Database, 
  FileText, 
  ArrowRight, 
  Link as LinkIcon, 
  Shield, 
  Users,
  Search,
  MessageSquare,
  Zap,
  CreditCard,
  Building,
  BarChart3,
  CheckCircle2
} from "lucide-react";

export default function Presentation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Chat state
  const [chatMessages, setChatMessages] = useState([
    { role: "ai", content: "Hi Andrew. I see you're logged into the Merchant Dashboard. How can I help you today?" }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const totalSlides = 5;

  const scrollToSlide = (index: number) => {
    if (containerRef.current) {
      const slideWidth = containerRef.current.clientWidth;
      containerRef.current.scrollTo({
        left: index * slideWidth,
        behavior: "smooth"
      });
      setCurrentSlide(index);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current) {
        const index = Math.round(containerRef.current.scrollLeft / containerRef.current.clientWidth);
        setCurrentSlide(index);
      }
    };
    
    const el = containerRef.current;
    if (el) {
      el.addEventListener("scroll", handleScroll, { passive: true });
      return () => el.removeEventListener("scroll", handleScroll);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === "ArrowRight" && currentSlide < totalSlides - 1) {
        scrollToSlide(currentSlide + 1);
      } else if (e.key === "ArrowLeft" && currentSlide > 0) {
        scrollToSlide(currentSlide - 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentSlide]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isTyping]);

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    setChatMessages(prev => [...prev, { role: "user", content: text }]);
    setInputValue("");
    setIsTyping(true);

    setTimeout(() => {
      let reply = "That's a great question. In the live version of Spectre Ask, I will fetch real-time data from your Lumino account or query learn.lumino.io to answer this for you!";
      const lower = text.toLowerCase();
      
      if (lower.includes("invoice") || lower.includes("bill")) {
        reply = "I can help with that. Would you like me to draft a new invoice or show you recent ones from your history?";
      } else if (lower.includes("acme") || lower.includes("recent payments")) {
        reply = "Here are the latest 3 transactions for Acme Corp. Would you like me to send them a receipt or draft a new invoice?";
      } else if (lower.includes("klarna") || lower.includes("buy now")) {
        reply = "Klarna allows your customers to buy now and pay later. You can enable it directly in Settings > Payment Methods.";
      } else if (lower.includes("link") || lower.includes("pay") || lower.includes("fee") || lower.includes("card")) {
        reply = "You can use **Dual Pricing**. I can enable that for you, or you can go to Settings > Payment Methods to turn it on manually.";
      }

      setChatMessages(prev => [...prev, { role: "ai", content: reply }]);
      setIsTyping(false);
    }, 1200);
  };

  return (
    <div className="relative h-full w-full bg-zinc-50 text-zinc-900 overflow-hidden font-sans">
      
      {/* Slide Controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-white/80 backdrop-blur-md px-6 py-3 rounded-full shadow-lg border border-zinc-200">
        <button 
          onClick={() => scrollToSlide(Math.max(0, currentSlide - 1))}
          disabled={currentSlide === 0}
          className="p-2 rounded-full hover:bg-zinc-100 disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <div className="flex gap-2">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <button
              key={i}
              onClick={() => scrollToSlide(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                currentSlide === i ? "bg-violet-600 w-6" : "bg-zinc-300 hover:bg-zinc-400"
              }`}
            />
          ))}
        </div>

        <button 
          onClick={() => scrollToSlide(Math.min(totalSlides - 1, currentSlide + 1))}
          disabled={currentSlide === totalSlides - 1}
          className="p-2 rounded-full hover:bg-zinc-100 disabled:opacity-30 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Main Container */}
      <div 
        ref={containerRef}
        className="flex h-full w-full overflow-x-auto snap-x snap-mandatory hide-scrollbar"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        
        {/* SLIDE 1: Title */}
        <section className="min-w-full h-full snap-center flex items-center justify-center relative px-8">
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-50 via-white to-violet-50/50 -z-10" />
          
          <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-sm font-medium border border-violet-200">
                <Sparkles className="w-4 h-4" />
                <span>Spectre Beta</span>
              </div>
              <h1 className="text-5xl lg:text-7xl font-semibold tracking-tight text-zinc-900 leading-[1.1]">
                Meet <br/><span className="text-violet-600">Lumino Ask.</span>
              </h1>
              <p className="text-xl text-zinc-600 leading-relaxed max-w-lg">
                In-context AI help, live data access, and chat-built workflows for Merchants, Partners, and Admins.
              </p>
              <div className="pt-4 flex gap-4">
                <button onClick={() => scrollToSlide(1)} className="flex items-center gap-2 bg-zinc-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-zinc-800 transition-colors shadow-sm">
                  View Demo <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Mockup UI */}
            <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col h-[500px]">
              <div className="border-b border-zinc-100 p-4 flex items-center gap-3 bg-zinc-50/50">
                <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-zinc-900">Spectre</h3>
                  <p className="text-xs text-zinc-500">Ready to assist</p>
                </div>
              </div>
              <div className="flex-1 p-6 flex flex-col justify-end space-y-4 bg-zinc-50/30 overflow-y-auto no-scrollbar">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`p-4 rounded-2xl shadow-sm max-w-[85%] ${msg.role === 'ai' ? 'bg-white border border-zinc-200 rounded-bl-none self-start text-zinc-700' : 'bg-violet-600 text-white rounded-br-none self-end'}`}>
                    <p className="text-sm" dangerouslySetInnerHTML={{__html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}} />
                  </div>
                ))}
                {isTyping && (
                  <div className="bg-white border border-zinc-200 p-4 rounded-2xl rounded-bl-none shadow-sm self-start max-w-[85%] flex gap-1 items-center">
                    <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{animationDelay: '0s'}} />
                    <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{animationDelay: '0.15s'}} />
                    <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{animationDelay: '0.3s'}} />
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-4 border-t border-zinc-100 bg-white">
                <select 
                  className="w-full bg-transparent border-b border-zinc-200 mb-3 pb-2 text-sm text-zinc-500 focus:outline-none focus:border-violet-500 cursor-pointer"
                  onChange={(e) => {
                    if (e.target.value) handleSend(e.target.value);
                    e.target.value = "";
                  }}
                >
                  <option value="">Choose a sample question...</option>
                  <option value="What's the easiest way to pass card fees to my customers?">How to pass card fees?</option>
                  <option value="How do I create a new invoice for my customer?">Create a new invoice</option>
                  <option value="Show me recent payments for Acme Corp">Show recent payments</option>
                  <option value="How do I set up Klarna buy now, pay later?">Setup Klarna</option>
                </select>
                <div className="relative">
                  <input 
                    type="text" 
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend(inputValue)}
                    placeholder="Ask anything..." 
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all" 
                  />
                  <button 
                    onClick={() => handleSend(inputValue)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SLIDE 2: Features - Merchant Focus */}
        <section className="min-w-full h-full snap-center flex items-center justify-center px-8 relative">
          <div className="max-w-6xl w-full">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-4xl font-semibold tracking-tight text-zinc-900">Context-Aware Data Actions</h2>
              <p className="text-xl text-zinc-600 max-w-2xl mx-auto">Not just a knowledge base. Spectre connects securely to your live data based on your privileges.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bg-white p-8 rounded-2xl shadow-lg shadow-zinc-200/50 border border-zinc-200 hover:border-violet-300 transition-colors group">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Live RAG Guidance</h3>
                <p className="text-zinc-600 text-sm leading-relaxed mb-6">Instantly searches <span className="font-mono text-xs bg-zinc-100 px-1 py-0.5 rounded text-zinc-800">learn.lumino.io</span> to answer product questions natively.</p>
                <div className="bg-zinc-50 border border-zinc-100 rounded-lg p-4">
                  <p className="text-xs text-zinc-500 italic">"How do I set up Klarna buy now, pay later at checkout?"</p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="bg-white p-8 rounded-2xl shadow-lg shadow-zinc-200/50 border border-zinc-200 hover:border-violet-300 transition-colors group">
                <div className="w-12 h-12 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Database className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Fetch & Analyze</h3>
                <p className="text-zinc-600 text-sm leading-relaxed mb-6">Read-only MCP tools to fetch customer data, transaction history, and balances instantly.</p>
                <div className="bg-zinc-50 border border-zinc-100 rounded-lg p-4">
                  <p className="text-xs text-zinc-500 italic">"Show me the last 3 transactions from Acme Corp."</p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="bg-white p-8 rounded-2xl shadow-lg shadow-zinc-200/50 border border-zinc-200 hover:border-violet-300 transition-colors group">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Execute Workflows</h3>
                <p className="text-zinc-600 text-sm leading-relaxed mb-6">Jump from questions to actions. Generate pay links, draft invoices, or refund payments in chat.</p>
                <div className="bg-zinc-50 border border-zinc-100 rounded-lg p-4">
                  <p className="text-xs text-zinc-500 italic">"Create a $1,500 pay link for web design services."</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SLIDE 3: Interactive Demo Mockup */}
        <section className="min-w-full h-full snap-center flex items-center justify-center px-8 bg-zinc-900 relative">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-violet-600/20 blur-[120px] rounded-full" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full" />
          </div>

          <div className="max-w-5xl w-full relative z-10 flex flex-col md:flex-row gap-12 items-center">
            <div className="flex-1 space-y-6 text-white">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-sm font-medium border border-white/20">
                <CreditCard className="w-4 h-4" />
                <span>Merchant Workflow Demo</span>
              </div>
              <h2 className="text-4xl lg:text-5xl font-semibold tracking-tight leading-tight">
                Stop clicking around.<br />Just ask.
              </h2>
              <p className="text-lg text-zinc-400 max-w-md">
                Spectre understands your business context. It combines UI elements and conversational AI to get work done faster.
              </p>
              
              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-3 text-sm text-zinc-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  No more hunting for the invoice button
                </div>
                <div className="flex items-center gap-3 text-sm text-zinc-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  Instant contextual summaries
                </div>
                <div className="flex items-center gap-3 text-sm text-zinc-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  Dynamic UI generation based on intent
                </div>
              </div>
            </div>

            {/* Chat Mockup with Table */}
            <div className="flex-1 w-full bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[550px]">
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="font-mono text-xs text-zinc-500">Ask.hecksec.tech</div>
                <div className="w-16" />
              </div>
              <div className="flex-1 p-6 overflow-y-auto space-y-6">
                
                <div className="flex justify-end">
                  <div className="bg-zinc-800 text-white px-4 py-3 rounded-2xl rounded-tr-none text-sm max-w-[80%] border border-zinc-700">
                    Show me the recent payments for "Acme Corp"
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-violet-400" />
                  </div>
                  <div className="space-y-3 w-full">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 inline-block">
                      <p className="text-sm text-zinc-300">Here are the latest 3 transactions for Acme Corp. Would you like me to send them a receipt or draft a new invoice?</p>
                    </div>
                    
                    {/* Embedded UI Card */}
                    <div className="bg-white rounded-xl overflow-hidden border border-zinc-200 w-full shadow-lg">
                      <table className="w-full text-left text-sm text-zinc-800">
                        <thead className="bg-zinc-50 border-b border-zinc-200">
                          <tr>
                            <th className="px-4 py-2 font-semibold">Date</th>
                            <th className="px-4 py-2 font-semibold">Status</th>
                            <th className="px-4 py-2 font-semibold text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          <tr>
                            <td className="px-4 py-3 font-mono text-xs">Aug 24</td>
                            <td className="px-4 py-3"><span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md text-xs font-medium border border-emerald-200">Succeeded</span></td>
                            <td className="px-4 py-3 text-right font-medium">$4,500.00</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 font-mono text-xs">Jul 24</td>
                            <td className="px-4 py-3"><span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md text-xs font-medium border border-emerald-200">Succeeded</span></td>
                            <td className="px-4 py-3 text-right font-medium">$4,500.00</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 font-mono text-xs">Jun 24</td>
                            <td className="px-4 py-3"><span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md text-xs font-medium border border-amber-200">Pending</span></td>
                            <td className="px-4 py-3 text-right font-medium">$4,500.00</td>
                          </tr>
                        </tbody>
                      </table>
                      <div className="bg-zinc-50 px-4 py-2 border-t border-zinc-200 flex justify-between items-center">
                        <span className="text-xs text-zinc-500 font-medium cursor-pointer hover:text-zinc-800">View full history →</span>
                        <button className="bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium px-3 py-1.5 rounded-md transition-colors">
                          Create Invoice
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* SLIDE 4: Architecture & Security */}
        <section className="min-w-full h-full snap-center flex items-center justify-center px-8 relative">
          <div className="max-w-6xl w-full">
            <div className="mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 text-zinc-800 text-sm font-medium mb-6">
                <Shield className="w-4 h-4" />
                <span>Privilege-Aware Routing</span>
              </div>
              <h2 className="text-4xl font-semibold tracking-tight text-zinc-900 mb-4">Built for Partners & Admins, too.</h2>
              <p className="text-xl text-zinc-600 max-w-2xl">
                Spectre Ask uses Clerk to enforce identity. What you can see in Lumino is exactly what the AI can see.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="p-6 border border-zinc-200 rounded-2xl bg-white shadow-sm flex flex-col h-full">
                <Building className="w-8 h-8 text-zinc-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Partner Capabilities</h3>
                <p className="text-sm text-zinc-600 mb-4 flex-1">
                  Partners get tools to view residuals, monitor portfolio health, and check lead statuses natively.
                </p>
                <div className="pt-4 border-t border-zinc-100 flex gap-2">
                  <span className="text-xs font-mono bg-orange-100 text-orange-800 px-2 py-1 rounded border border-orange-200">HubSpot</span>
                  <span className="text-xs font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded border border-blue-200">Residuals API</span>
                </div>
              </div>

              <div className="p-6 border border-zinc-200 rounded-2xl bg-zinc-900 text-white shadow-sm flex flex-col h-full relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Shield className="w-24 h-24" />
                </div>
                <Shield className="w-8 h-8 text-violet-400 mb-4 relative z-10" />
                <h3 className="text-lg font-semibold mb-2 relative z-10">Admin & Dev Ops</h3>
                <p className="text-sm text-zinc-400 mb-4 flex-1 relative z-10">
                  HeckSec/Lumino Admins can query AWS statuses, review DevOps logs, and manage Linear/GitHub issues in chat.
                </p>
                <div className="pt-4 border-t border-zinc-800 flex gap-2 relative z-10">
                  <span className="text-xs font-mono bg-zinc-800 text-zinc-300 px-2 py-1 rounded border border-zinc-700">AWS</span>
                  <span className="text-xs font-mono bg-purple-900/50 text-purple-300 px-2 py-1 rounded border border-purple-800/50">Linear</span>
                  <span className="text-xs font-mono bg-zinc-800 text-zinc-300 px-2 py-1 rounded border border-zinc-700">GitHub</span>
                </div>
              </div>

              <div className="p-6 border border-zinc-200 rounded-2xl bg-white shadow-sm flex flex-col h-full">
                <Search className="w-8 h-8 text-zinc-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Model Matrix Routing</h3>
                <p className="text-sm text-zinc-600 mb-4 flex-1">
                  OpenRouter classifies user intent in ms, routing complex dev questions to Claude 3.5 Sonnet, and simple chats to fast Llama models.
                </p>
                <div className="pt-4 border-t border-zinc-100 flex gap-2">
                  <span className="text-xs font-mono bg-zinc-100 text-zinc-800 px-2 py-1 rounded border border-zinc-200">OpenRouter</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SLIDE 5: Next Steps */}
        <section className="min-w-full h-full snap-center flex items-center justify-center px-8 relative bg-zinc-50">
          <div className="max-w-3xl w-full text-center space-y-8">
            <div className="w-20 h-20 bg-white border border-zinc-200 rounded-2xl shadow-xl flex items-center justify-center mx-auto mb-8 relative">
              <Bot className="w-10 h-10 text-violet-600" />
              <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
            </div>
            
            <h2 className="text-5xl font-semibold tracking-tight text-zinc-900">Ready for Launch.</h2>
            <p className="text-xl text-zinc-600">
              Spectre Ask is designed to be a standalone, high-performance Next.js application that embeds beautifully into any Lumino dashboard.
            </p>
            
            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm text-left max-w-xl mx-auto mt-12">
              <h4 className="font-semibold mb-4 text-zinc-900">Rollout Strategy</h4>
              <ul className="space-y-4">
                <li className="flex gap-3 text-sm text-zinc-600">
                  <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 font-mono text-xs shrink-0">1</div>
                  <p><strong className="text-zinc-900">Internal Alpha:</strong> Deploy to Vercel (ask.hecksec.tech). Test Admin tools (AWS, Linear) and Dev flows.</p>
                </li>
                <li className="flex gap-3 text-sm text-zinc-600">
                  <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 font-mono text-xs shrink-0">2</div>
                  <p><strong className="text-zinc-900">Partner Beta:</strong> Invite select partners. Validate HubSpot and residuals API integrations.</p>
                </li>
                <li className="flex gap-3 text-sm text-zinc-600">
                  <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-mono text-xs shrink-0 border border-violet-200">3</div>
                  <p><strong className="text-zinc-900">Merchant General Release:</strong> Embed in Lumino Merchant Dashboard as the permanent "Ask" floating widget.</p>
                </li>
              </ul>
            </div>
            
            <div className="pt-8">
              <button onClick={() => scrollToSlide(0)} className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors">
                Back to beginning
              </button>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
