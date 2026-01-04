import React, { useState, useEffect, useRef } from 'react';
import { startConciergeChat } from '../services/geminiService.ts';

interface GuideViewerProps {
  content: string; 
  propertyName: string;
  onBack: () => void;
  isGuestMode?: boolean;
}

const SECTION_ICONS: Record<string, React.ReactNode> = {
  wifi: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.345 8.982c5.858-5.857 15.352-5.857 21.21 0" /></svg>,
  checkIn: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>,
  videoGuides: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2-2v8a2 2 0 002 2z" /></svg>,
  gallery: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>,
  houseRules: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  emergency: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
  checkout: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
  localGems: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
};

export const GuideViewer: React.FC<GuideViewerProps> = ({ content, propertyName, onBack, isGuestMode }) => {
  const [data, setData] = useState<any>(null);
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [input, setInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [chatSession, setChatSession] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!content) return;

    try {
      // Robust cleaning of the input string to handle potential markdown code blocks from LLMs
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```(?:json)?/, '').replace(/```$/, '').trim();
      }
      setData(JSON.parse(cleanContent));
    } catch (e) {
      console.error("Failed to parse guide content", e, content);
      // Fallback to empty data to avoid permanent loading state if parsing fails
      setData({});
    }
  }, [content]);

  useEffect(() => {
    if (data && Object.keys(data).length > 0 && !chatSession) {
      setChatSession(startConciergeChat(data));
    }
  }, [data, chatSession]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !chatSession) return;

    const userText = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsChatting(true);

    try {
      const response = await chatSession.sendMessage({ message: userText });
      setMessages(prev => [...prev, { role: 'model', text: response.text || "I'm not sure how to answer that." }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', text: "I'm having trouble connecting right now. Please try again or contact the host." }]);
    } finally {
      setIsChatting(false);
    }
  };

  if (!data) return <div className="p-20 text-center text-slate-400 font-medium">Preparing your digital guide...</div>;
  if (Object.keys(data).length === 0) return (
    <div className="p-20 text-center space-y-4">
      <p className="text-slate-500">Oops! We couldn't load the guide details.</p>
      <button onClick={onBack} className="text-rose-500 font-bold underline">Go Back</button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-32 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-4 no-print">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-rose-500 font-bold transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          {isGuestMode ? 'Exit Guide' : 'Back to Dashboard'}
        </button>
        <button onClick={() => window.print()} className="bg-slate-100 p-2 rounded-xl text-slate-600 hover:bg-slate-200 transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
        </button>
      </div>

      <div className="relative h-64 sm:h-96 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <img src={data.heroImageUrl} alt={propertyName} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8 sm:p-12">
          <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight">{propertyName}</h1>
          <p className="text-white/80 text-lg mt-2 font-medium">{data.welcome}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-3 text-rose-500">
                {SECTION_ICONS.wifi}
                <h3 className="font-bold text-slate-900">WiFi Details</h3>
              </div>
              <div className="space-y-2">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">Network</span>
                  <span className="font-bold text-slate-900 select-all">{data.wifi?.name}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">Password</span>
                  <span className="font-bold text-slate-900 select-all">{data.wifi?.password}</span>
                </div>
                {data.wifi?.instructions && <p className="text-sm text-slate-500 px-1 italic">{data.wifi.instructions}</p>}
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-3 text-rose-500">
                {SECTION_ICONS.checkIn}
                <h3 className="font-bold text-slate-900">Check-In</h3>
              </div>
              <div className="space-y-3">
                <p className="text-sm font-bold text-slate-900">{data.checkIn?.method}</p>
                <p className="text-sm text-slate-600 leading-relaxed">{data.checkIn?.instructions}</p>
                {data.checkIn?.accessCode && (
                  <div className="bg-rose-50 p-3 rounded-2xl border border-rose-100 text-center">
                    <span className="block text-[10px] text-rose-400 font-bold uppercase">Access Code</span>
                    <span className="text-xl font-black text-rose-600 tracking-widest">{data.checkIn.accessCode}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {data.videoGuides?.length > 0 && (
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center gap-3 text-rose-500">
                {SECTION_ICONS.videoGuides}
                <h3 className="text-xl font-bold text-slate-900">Video Tutorials</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {data.videoGuides.map((video: any, idx: number) => {
                  const videoId = video.url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([^?&"'>]+)/)?.[1];
                  return (
                    <div key={idx} className="group overflow-hidden rounded-3xl border border-slate-100 bg-slate-50 transition-all hover:shadow-md">
                      {videoId ? (
                        <div className="aspect-video w-full">
                          <iframe 
                            src={`https://www.youtube.com/embed/${videoId}`} 
                            className="w-full h-full"
                            title={video.title}
                            allowFullScreen
                          />
                        </div>
                      ) : (
                        <a href={video.url} target="_blank" rel="noopener noreferrer" className="aspect-video w-full bg-slate-200 flex items-center justify-center hover:bg-slate-300 transition-colors">
                           <svg className="w-12 h-12 text-slate-400" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
                        </a>
                      )}
                      <div className="p-4">
                        <h4 className="font-bold text-slate-900 text-sm group-hover:text-rose-500 transition-colors">{video.title}</h4>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-rose-500">
                {SECTION_ICONS.houseRules}
                <h3 className="text-xl font-bold text-slate-900">House Rules</h3>
              </div>
              <ul className="space-y-3">
                {data.houseRules?.map((rule: string, idx: number) => (
                  <li key={idx} className="flex gap-3 text-sm text-slate-600 bg-white p-4 rounded-2xl border border-slate-100">
                    <span className="text-rose-500 font-black">{idx + 1}.</span>
                    {rule}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-3 text-rose-500">
                {SECTION_ICONS.emergency}
                <h3 className="text-xl font-bold text-slate-900">Emergency</h3>
              </div>
              <div className="bg-red-50 p-6 rounded-3xl border border-red-100 space-y-4">
                <div className="flex flex-col">
                  <span className="text-[10px] text-red-400 font-black uppercase tracking-widest mb-1">Emergency Contact</span>
                  <a href={`tel:${data.emergency?.phone}`} className="text-xl font-black text-red-600 hover:underline">{data.emergency?.phone}</a>
                </div>
                {data.emergency?.safetyInfo && (
                  <div className="pt-4 border-t border-red-100">
                    <p className="text-sm text-red-700 leading-relaxed font-medium">{data.emergency.safetyInfo}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {data.localGems?.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-rose-500">
                {SECTION_ICONS.localGems}
                <h3 className="text-xl font-bold text-slate-900">Local Hotspots</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {data.localGems.map((gem: any, idx: number) => (
                  <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-slate-900">{gem.name}</h4>
                      <span className="text-[10px] font-black text-rose-500 bg-rose-50 px-2 py-1 rounded-full uppercase">{gem.type}</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{gem.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.checkout && (
            <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-rose-400">
                  {SECTION_ICONS.checkout}
                  <h3 className="text-xl font-bold">Checkout Info</h3>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">By {data.checkout.time}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {data.checkout.tasks?.map((task: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-3 bg-white/10 p-4 rounded-2xl border border-white/5">
                    <div className="w-5 h-5 rounded-full border-2 border-rose-400 flex-shrink-0" />
                    <span className="text-sm font-medium">{task}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-8">
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm text-center space-y-4">
            <div className="relative w-24 h-24 mx-auto">
              <img 
                src={data.host?.photo || "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=200"} 
                alt={data.host?.name} 
                className="w-full h-full object-cover rounded-full border-4 border-rose-50 shadow-inner"
              />
              <div className="absolute -bottom-1 -right-1 bg-green-500 w-6 h-6 rounded-full border-4 border-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Host: {data.host?.name}</h3>
              <p className="text-xs text-slate-500 font-medium">Available for any questions</p>
            </div>
            <a 
              href={`tel:${data.emergency?.phone}`}
              className="block w-full bg-slate-900 text-white py-3 rounded-2xl font-bold hover:bg-slate-800 transition-all text-sm"
            >
              Contact Host
            </a>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col h-[500px] sticky top-24 no-print">
            <div className="bg-rose-500 p-6 text-white">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                </div>
                <div>
                  <h3 className="font-bold text-sm">Smart Concierge</h3>
                  <p className="text-[10px] text-white/80 font-medium">Ask me anything about your stay</p>
                </div>
              </div>
            </div>
            
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <div className="bg-white w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 text-rose-200 shadow-sm">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                  </div>
                  <p className="text-xs text-slate-400 font-medium max-w-[180px] mx-auto">"How do I use the coffee machine?" or "What's the WiFi password?"</p>
                </div>
              )}
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm font-medium shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-rose-500 text-white rounded-tr-none' 
                      : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isChatting && (
                <div className="flex justify-start animate-pulse">
                  <div className="bg-white px-4 py-2 rounded-2xl rounded-tl-none border border-slate-100">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-100 flex gap-2">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your question..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500 transition-all placeholder-slate-400 text-slate-900"
              />
              <button 
                type="submit" 
                disabled={!input.trim() || isChatting}
                className="bg-rose-500 text-white p-2 rounded-xl hover:bg-rose-600 disabled:opacity-50 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
            </form>
          </div>
        </div>
      </div>

      {data.gallery?.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-rose-500">
            {SECTION_ICONS.gallery}
            <h3 className="text-xl font-bold text-slate-900">Property Gallery</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {data.gallery.map((img: string, idx: number) => (
              <div key={idx} className="aspect-square rounded-3xl overflow-hidden shadow-sm group cursor-pointer border border-slate-100">
                <img src={img} alt={`Gallery ${idx}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};