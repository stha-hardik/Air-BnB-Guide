
import React, { useState, useEffect, useRef } from 'react';
import { startConciergeChat } from '../services/geminiService';

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
  emergency: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  localGems: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
};

const getYoutubeEmbedUrl = (url: any) => {
  if (!url || typeof url !== 'string') return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2] && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
};

const SectionCard: React.FC<{ 
  title: string; 
  id: string; 
  isOpen: boolean; 
  onToggle: () => void; 
  children: React.ReactNode 
}> = ({ title, id, isOpen, onToggle, children }) => {
  return (
    <div className={`bg-white rounded-[1.5rem] border border-slate-100 shadow-sm overflow-hidden transition-all duration-300 ${isOpen ? 'shadow-md' : 'hover:shadow-md hover:border-rose-100'}`}>
      <button 
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
      >
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl transition-colors ${isOpen ? 'bg-rose-500 text-white' : 'bg-slate-50 text-slate-400'}`}>
            {SECTION_ICONS[id] || <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          </div>
          <span className="text-lg font-bold text-slate-900">{title}</span>
        </div>
        <svg className={`w-5 h-5 text-slate-300 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
      </button>
      <div className={`transition-all duration-300 ${isOpen ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
        <div className="px-6 pb-6 pt-2 border-t border-slate-50">
          {children}
        </div>
      </div>
    </div>
  );
};

export const GuideViewer: React.FC<GuideViewerProps> = ({ content, propertyName, onBack, isGuestMode }) => {
  const [data, setData] = useState<any>(null);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const parsed = typeof content === 'string' ? JSON.parse(content || "{}") : content;
      setData(parsed);
      if (parsed && Object.keys(parsed).length > 0) {
        chatRef.current = startConciergeChat(parsed);
        setMessages([{ role: 'model', text: `Hi! I'm your digital concierge for ${propertyName}. How can I help you today?` }]);
      }
    } catch (e) {
      console.error("Failed to parse guide JSON", e);
    }
  }, [content, propertyName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isTyping || !chatRef.current) return;

    const userText = userInput;
    setUserInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsTyping(true);

    try {
      const result = await chatRef.current.sendMessage({ message: userText });
      setMessages(prev => [...prev, { role: 'model', text: result.text || "I'm not sure about that. Try contacting the host!" }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I'm having trouble connecting. Please try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!data || Object.keys(data).length === 0) return <div className="p-20 text-center font-bold text-slate-400">Loading your guide...</div>;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#F7F7F7] pb-24 relative shadow-2xl">
      <div className="relative h-72 overflow-hidden shadow-lg">
        <img 
          src={data.heroImageUrl || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=800'} 
          alt="Property" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        {!isGuestMode && (
          <button 
            onClick={onBack}
            className="absolute top-6 left-6 bg-white/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/40 transition-all no-print"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </button>
        )}
        <div className="absolute bottom-8 left-6 right-6">
          <p className="text-white/80 text-[10px] font-black uppercase tracking-[0.2em] mb-0.5 drop-shadow-md">Hosted by {data.host?.name || 'Superhost'}</p>
          <h1 className="text-xl font-black text-white leading-tight drop-shadow-lg">{propertyName}</h1>
        </div>
      </div>

      <div className="p-6">
        <div className="bg-white p-6 rounded-[1.5rem] shadow-sm mb-6 border border-slate-100">
           <h2 className="text-slate-900 font-black text-lg mb-2">Welcome Home!</h2>
           <p className="text-slate-500 text-sm leading-relaxed">{data.welcome}</p>
        </div>

        <div className="space-y-4">
          {data.wifi && (
            <SectionCard 
              title="WiFi" 
              id="wifi" 
              isOpen={openSection === 'wifi'} 
              onToggle={() => setOpenSection(openSection === 'wifi' ? null : 'wifi')}
            >
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center group active:bg-slate-100 transition-colors">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Network</span>
                    <p className="text-slate-900 font-bold select-all">{data.wifi.name}</p>
                  </div>
                  <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2-2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center active:bg-slate-100 transition-colors">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Password</span>
                    <p className="text-slate-900 font-bold select-all">{data.wifi.password}</p>
                  </div>
                  <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2-2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                </div>
                {data.wifi.instructions && <p className="text-sm text-slate-500 italic px-1">{data.wifi.instructions}</p>}
              </div>
            </SectionCard>
          )}

          {data.checkIn && (
            <SectionCard 
              title="Check-in Info" 
              id="checkIn" 
              isOpen={openSection === 'checkIn'} 
              onToggle={() => setOpenSection(openSection === 'checkIn' ? null : 'checkIn')}
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3 bg-rose-50 p-3 rounded-xl">
                   <div className="bg-rose-100 p-2 rounded-lg text-rose-500"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg></div>
                   <span className="text-sm font-bold text-rose-600">{data.checkIn.method}</span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed px-1">{data.checkIn.instructions}</p>
              </div>
            </SectionCard>
          )}

          {data.gallery && Array.isArray(data.gallery) && data.gallery.length > 0 && (
            <SectionCard 
              title="Property Photos" 
              id="gallery" 
              isOpen={openSection === 'gallery'} 
              onToggle={() => setOpenSection(openSection === 'gallery' ? null : 'gallery')}
            >
              <div className="grid grid-cols-2 gap-3">
                {data.gallery.map((img: string, i: number) => (
                  <div key={i} className="aspect-square rounded-2xl overflow-hidden bg-slate-100 shadow-sm">
                    <img src={img} className="w-full h-full object-cover" alt={`Property view ${i+1}`} />
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {data.videoGuides && Array.isArray(data.videoGuides) && data.videoGuides.length > 0 && (
            <SectionCard 
              title="Video Tutorials" 
              id="videoGuides" 
              isOpen={openSection === 'videoGuides'} 
              onToggle={() => setOpenSection(openSection === 'videoGuides' ? null : 'videoGuides')}
            >
              <div className="space-y-6">
                {data.videoGuides.map((video: any, i: number) => {
                  if (!video || (!video.url && !video.title)) return null;
                  const embedUrl = getYoutubeEmbedUrl(video.url);
                  return (
                    <div key={i} className="space-y-3">
                      <h4 className="text-sm font-bold text-slate-800">{video.title || "Video Tutorial"}</h4>
                      {embedUrl ? (
                        <div className="relative aspect-video rounded-2xl overflow-hidden shadow-inner bg-slate-100">
                          <iframe 
                            src={embedUrl}
                            className="absolute inset-0 w-full h-full border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          ></iframe>
                        </div>
                      ) : video.url ? (
                        <a href={video.url} target="_blank" rel="noopener noreferrer" className="block p-4 bg-slate-50 rounded-2xl text-rose-500 font-bold text-sm underline hover:bg-rose-50 transition-colors">Watch Tutorial External →</a>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

          {data.houseRules && Array.isArray(data.houseRules) && data.houseRules.length > 0 && (
            <SectionCard 
              title="House Rules" 
              id="houseRules" 
              isOpen={openSection === 'houseRules'} 
              onToggle={() => setOpenSection(openSection === 'houseRules' ? null : 'houseRules')}
            >
              <ul className="space-y-4 px-1">
                {data.houseRules.map((rule: string, i: number) => (
                  <li key={i} className="flex gap-4 items-start group">
                    <div className="w-6 h-6 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400 flex-shrink-0 group-hover:bg-rose-50 group-hover:text-rose-500 transition-colors">{i+1}</div>
                    <span className="text-sm text-slate-700 leading-relaxed pt-0.5">{rule}</span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          {data.localGems && Array.isArray(data.localGems) && data.localGems.length > 0 && (
            <SectionCard 
              title="Local Gems" 
              id="localGems" 
              isOpen={openSection === 'localGems'} 
              onToggle={() => setOpenSection(openSection === 'localGems' ? null : 'localGems')}
            >
              <div className="space-y-4">
                {data.localGems.map((gem: any, i: number) => (
                  <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 hover:border-rose-100 transition-all">
                    <span className="inline-block px-2.5 py-1 bg-rose-50 text-rose-600 text-[10px] font-black rounded-lg uppercase mb-2 tracking-wider">{gem.type}</span>
                    <h4 className="font-bold text-slate-900">{gem.name}</h4>
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{gem.description}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {data.emergency && (
            <SectionCard 
              title="Emergency" 
              id="emergency" 
              isOpen={openSection === 'emergency'} 
              onToggle={() => setOpenSection(openSection === 'emergency' ? null : 'emergency')}
            >
              <div className="space-y-5">
                <a href={`tel:${data.emergency.phone}`} className="block bg-red-500 p-5 rounded-2xl text-center shadow-lg shadow-red-100 active:scale-95 transition-all">
                  <span className="block text-[10px] font-black text-red-200 uppercase mb-1 tracking-widest">Tap to Call</span>
                  <p className="text-white font-black text-xl">{data.emergency.phone}</p>
                </a>
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">Safety Locations</h4>
                  <p className="text-sm text-slate-600 leading-relaxed font-medium">{data.emergency.safetyInfo}</p>
                </div>
              </div>
            </SectionCard>
          )}
        </div>
      </div>

      {chatOpen && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md h-[85vh] sm:h-[650px] sm:rounded-[2.5rem] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="p-6 border-b flex justify-between items-center bg-rose-500 text-white sm:rounded-t-[2.5rem] shadow-md">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-2.5 rounded-2xl">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                </div>
                <div>
                  <h3 className="font-black text-lg">Smart Concierge</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <p className="text-[10px] font-black uppercase opacity-80 tracking-widest">Active Assistant</p>
                  </div>
                </div>
              </div>
              <button onClick={() => setChatOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l18 18" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-5 py-3.5 rounded-[1.5rem] text-sm shadow-sm leading-relaxed ${
                    m.role === 'user' 
                      ? 'bg-rose-500 text-white rounded-br-none' 
                      : 'bg-white text-slate-800 rounded-bl-none border border-slate-100 font-medium'
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white px-5 py-4 rounded-[1.5rem] rounded-bl-none border border-slate-100 flex gap-1.5 items-center">
                    <span className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-5 bg-white border-t sm:rounded-b-[2.5rem]">
              <div className="relative flex items-center">
                <input 
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Where is the laundry?"
                  className="w-full pl-6 pr-14 py-4 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-rose-500 outline-none text-sm font-medium"
                />
                <button 
                  type="submit"
                  disabled={!userInput.trim() || isTyping}
                  className="absolute right-2 p-2.5 bg-rose-500 text-white rounded-xl disabled:opacity-50 hover:bg-rose-600 transition-all shadow-md shadow-rose-100 active:scale-95"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <button 
        onClick={() => setChatOpen(true)}
        className="fixed bottom-10 right-8 bg-rose-500 text-white px-8 py-4 rounded-full shadow-2xl shadow-rose-300 hover:scale-110 active:scale-95 transition-all z-50 flex items-center gap-3 font-black group no-print border-4 border-white"
      >
        <svg className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        CONCIERGE
      </button>
    </div>
  );
};
