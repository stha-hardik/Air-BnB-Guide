import React, { useState, useEffect } from 'react';
import { PropertyData, INITIAL_DATA, VideoGuide } from './types.ts';
import { generateGuestGuide } from './services/geminiService.ts';
import { supabase } from './services/supabaseClient.ts';
import { Input } from './components/Input.tsx';
import { ImageUpload } from './components/ImageUpload.tsx';
import { GuideViewer } from './components/GuideViewer.tsx';
import { Login } from './components/Login.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { QRModal } from './components/QRModal.tsx';

type AppMode = 'AUTH' | 'ONBOARDING' | 'DASHBOARD' | 'EDITOR' | 'VIEWER' | 'GUEST_VIEW';

interface UserProfile {
  id: string;
  name: string;
  email: string;
}

const totalSteps = 7;

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('AUTH');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [guides, setGuides] = useState<PropertyData[]>([]);
  const [activeGuide, setActiveGuide] = useState<PropertyData>(INITIAL_DATA);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [selectedQRGuide, setSelectedQRGuide] = useState<PropertyData | null>(null);

  useEffect(() => {
    let mounted = true;
    const initApp = async () => {
      const params = new URLSearchParams(window.location.search);
      const guestGuideId = params.get('g');

      if (guestGuideId) {
        try {
          const { data, error } = await supabase
            .from('guides')
            .select('*')
            .eq('id', guestGuideId)
            .single();

          if (mounted && data && !error) {
            setActiveGuide(data);
            setGeneratedContent(data.aiGeneratedContent || null);
            setMode('GUEST_VIEW');
            setIsLoading(false);
            return;
          }
        } catch (e) {
          console.error("Guest access error", e);
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (mounted) {
        if (session?.user) {
          const profile = {
            id: session.user.id,
            name: session.user.user_metadata.full_name || session.user.email?.split('@')[0] || 'User',
            email: session.user.email || ''
          };
          setUser(profile);
          setMode('DASHBOARD');
          fetchGuides(profile.id);
        } else {
          setMode('AUTH');
        }
        setIsLoading(false);
      }
    };

    initApp();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        const profile = {
          id: session.user.id,
          name: session.user.user_metadata.full_name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || ''
        };
        setUser(profile);
        setMode(prevMode => (prevMode === 'AUTH' ? 'DASHBOARD' : prevMode));
        if (profile.id) fetchGuides(profile.id);
      } else {
        setUser(null);
        setMode(prevMode => (prevMode === 'GUEST_VIEW' ? 'GUEST_VIEW' : 'AUTH'));
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchGuides = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('guides')
        .select('*')
        .eq('user_id', userId)
        .order('createdAt', { ascending: false });

      if (error) throw error;
      if (data) setGuides(data.map(g => ({
        ...g,
        houseRules: Array.isArray(g.houseRules) ? g.houseRules : [],
        additionalPhotos: Array.isArray(g.additionalPhotos) ? g.additionalPhotos : [],
        videoGuides: Array.isArray(g.videoGuides) ? g.videoGuides : []
      })));
    } catch (err) {
      console.error("Failed to fetch guides:", err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setActiveGuide(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (field: 'heroImageUrl' | 'hostImageUrl', base64: string) => {
    setActiveGuide(prev => ({ ...prev, [field]: base64 }));
  };

  const handleCreateNew = () => {
    setActiveGuide({ 
      ...INITIAL_DATA, 
      id: crypto.randomUUID(), 
      createdAt: Date.now(),
      hostName: user?.name || '',
      houseRules: [],
      additionalPhotos: [],
      videoGuides: []
    });
    setGeneratedContent(null);
    setCurrentStep(1);
    setMode('ONBOARDING');
  };

  const handleAddVideo = () => setActiveGuide(p => ({ ...p, videoGuides: [...(p.videoGuides || []), { title: '', url: '' }] }));
  const handleVideoChange = (idx: number, f: keyof VideoGuide, v: string) => {
    setActiveGuide(p => {
      const nv = [...(p.videoGuides || [])];
      if (nv[idx]) {
        nv[idx] = { ...nv[idx], [f]: v };
      }
      return { ...p, videoGuides: nv };
    });
  };
  const handleAddPhoto = () => setActiveGuide(p => ({ ...p, additionalPhotos: [...(p.additionalPhotos || []), ''] }));
  const handlePhotoChange = (idx: number, v: string) => {
    setActiveGuide(p => {
      const np = [...(p.additionalPhotos || [])];
      np[idx] = v;
      return { ...p, additionalPhotos: np };
    });
  };
  const handleRemovePhoto = (idx: number) => setActiveGuide(p => ({ ...p, additionalPhotos: (p.additionalPhotos || []).filter((_, i) => i !== idx) }));
  const handleAddRule = () => setActiveGuide(p => ({ ...p, houseRules: [...(p.houseRules || []), ''] }));
  const handleRuleChange = (idx: number, v: string) => {
    setActiveGuide(p => {
      const nr = [...(p.houseRules || [])];
      nr[idx] = v;
      return { ...p, houseRules: nr };
    });
  };
  const handleRemoveRule = (idx: number) => setActiveGuide(p => ({ ...p, houseRules: (p.houseRules || []).filter((_, i) => i !== idx) }));
  const handleRemoveVideo = (idx: number) => setActiveGuide(p => ({ ...p, videoGuides: (p.videoGuides || []).filter((_, i) => i !== idx) }));

  const handleEdit = (guide: PropertyData) => {
    setActiveGuide({
      ...guide,
      houseRules: Array.isArray(guide.houseRules) ? guide.houseRules : [],
      additionalPhotos: Array.isArray(guide.additionalPhotos) ? guide.additionalPhotos : [],
      videoGuides: Array.isArray(guide.videoGuides) ? guide.videoGuides : []
    });
    setGeneratedContent(guide.aiGeneratedContent || null);
    setMode('EDITOR');
  };

  const handleView = async (guide: PropertyData) => {
    // Clear old state first to ensure fresh render
    setGeneratedContent(null);
    setActiveGuide(guide);

    if (guide.aiGeneratedContent) {
      setGeneratedContent(guide.aiGeneratedContent);
      setMode('VIEWER');
      return;
    }

    setIsGenerating(true);
    try {
      const content = await generateGuestGuide(guide);
      if (!content || content === "{}" || content.trim() === "") {
        throw new Error("AI failed to generate content.");
      }
      
      setGeneratedContent(content);
      await supabase.from('guides').update({ aiGeneratedContent: content }).eq('id', guide.id);
      setMode('VIEWER');
    } catch (err) {
      console.error("View generation error:", err);
      alert("AI Superhost is currently busy. Please try again in a few seconds.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('guides').delete().eq('id', id);
    if (error) {
      alert("Error deleting guide: " + error.message);
    } else {
      setGuides(prev => prev.filter(g => g.id !== id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!activeGuide.propertyName || !activeGuide.location) {
      alert("Property Name and Location are required.");
      setCurrentStep(1);
      return;
    }

    setIsGenerating(true);
    try {
      const sanitizedVideoGuides = (activeGuide.videoGuides || [])
        .filter(v => v && v.title?.trim() && v.url?.trim());
      
      const guideToSubmit = { ...activeGuide, videoGuides: sanitizedVideoGuides };
      
      const content = await generateGuestGuide(guideToSubmit);
      setGeneratedContent(content);
      
      const payload = {
        ...guideToSubmit,
        aiGeneratedContent: content,
        user_id: user.id,
      };
      
      const { error: saveError } = await supabase.from('guides').upsert(payload);
      if (saveError) throw saveError;
      
      await fetchGuides(user.id);
      setMode('VIEWER');
    } catch (err: any) {
      console.error("Submit Error:", err);
      alert(`Error building guide: ${err.message || 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 1 && (!activeGuide.propertyName || !activeGuide.location)) {
      alert("Please enter property name and location before continuing.");
      return;
    }
    setCurrentStep(prev => Math.min(prev + 1, totalSteps));
  };
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin h-10 w-10 text-rose-500 rounded-full border-4 border-t-transparent border-rose-100" /></div>;
  if (mode === 'GUEST_VIEW') return <GuideViewer content={activeGuide.aiGeneratedContent || "{}"} propertyName={activeGuide.propertyName} onBack={() => window.location.href = window.location.origin} isGuestMode={true} />;
  if (mode === 'AUTH') return <Login onLogin={() => {}} />;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {isGenerating && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
           <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl text-center max-w-sm w-full animate-in zoom-in duration-300">
             <div className="w-16 h-16 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
             <h3 className="text-xl font-bold text-slate-900 mb-2">Preparing your Guide</h3>
             <p className="text-slate-500 text-sm">AI Superhost is organizing your house manual. This usually takes 5-10 seconds...</p>
           </div>
        </div>
      )}

      <header className="bg-white border-b border-slate-200 py-4 px-4 sticky top-0 z-10 shadow-sm no-print">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button onClick={() => setMode('DASHBOARD')} className="flex items-center gap-3 group">
            <div className="bg-rose-500 p-2 rounded-xl text-white shadow-lg group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900 hidden sm:block">GuestGuide AI</h1>
          </button>
          <div className="flex items-center gap-6">
            <button onClick={async () => { await supabase.auth.signOut(); setMode('AUTH'); }} className="bg-slate-50 border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:bg-rose-50 hover:text-rose-600">Sign Out</button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-8">
        {mode === 'DASHBOARD' && <Dashboard guides={guides} userName={user?.name || 'Host'} onCreateNew={handleCreateNew} onEdit={handleEdit} onView={handleView} onDelete={handleDelete} onShowQR={setSelectedQRGuide} />}

        {(mode === 'ONBOARDING' || mode === 'EDITOR') && (
          <div className="max-w-3xl mx-auto">
            {mode === 'ONBOARDING' && (
              <div className="mb-10 text-center">
                <h2 className="text-2xl font-black text-slate-900">Step {currentStep} of {totalSteps}</h2>
                <div className="mt-4 w-full bg-slate-200 h-2.5 rounded-full overflow-hidden max-w-xs mx-auto shadow-inner">
                  <div className="bg-rose-500 h-full transition-all duration-700 ease-out" style={{ width: `${(currentStep/totalSteps)*100}%` }} />
                </div>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6 pb-24">
              {(currentStep === 1 || mode === 'EDITOR') && (
                <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
                  <h3 className="font-black text-slate-800 border-b pb-3 text-lg">1. Identity & Branding</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input label="Listing Name *" name="propertyName" value={activeGuide.propertyName} onChange={handleInputChange} required className="md:col-span-2" />
                    <Input label="Location *" name="location" value={activeGuide.location} onChange={handleInputChange} required />
                    <Input label="Property Type" name="propertyType" as="select" value={activeGuide.propertyType} onChange={handleInputChange}>
                      <option value="Apartment">Apartment</option>
                      <option value="House">House</option>
                      <option value="Cabin">Cabin</option>
                      <option value="Studio">Studio</option>
                      <option value="Villa">Villa</option>
                    </Input>
                    <Input label="Host Name" name="hostName" value={activeGuide.hostName} onChange={handleInputChange} />
                    <ImageUpload label="Host Profile Photo" value={activeGuide.hostImageUrl} onChange={(v) => handleImageChange('hostImageUrl', v)} />
                    <ImageUpload label="Property Hero Image" value={activeGuide.heroImageUrl} onChange={(v) => handleImageChange('heroImageUrl', v)} />
                  </div>
                </div>
              )}

              {(currentStep === 2 || mode === 'EDITOR') && (
                <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
                  <h3 className="font-bold text-slate-800 border-b pb-3 text-lg">2. Arrival & Access</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input label="Access Method" name="checkInMethod" placeholder="Lockbox code is 1234..." value={activeGuide.checkInMethod} onChange={handleInputChange} className="md:col-span-2" />
                    <Input label="Check-in Time" type="time" name="checkInTime" value={activeGuide.checkInTime} onChange={handleInputChange} />
                    <Input label="Check-out Time" type="time" name="checkOutTime" value={activeGuide.checkOutTime} onChange={handleInputChange} />
                    <Input label="Parking Info" name="parkingInfo" value={activeGuide.parkingInfo} onChange={handleInputChange} className="md:col-span-2" />
                  </div>
                </div>
              )}

              {(currentStep === 3 || mode === 'EDITOR') && (
                <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
                  <h3 className="font-bold text-slate-800 border-b pb-3 text-lg">3. Connectivity</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input label="WiFi Name" name="wifiName" value={activeGuide.wifiName} onChange={handleInputChange} />
                    <Input label="WiFi Password" name="wifiPassword" value={activeGuide.wifiPassword} onChange={handleInputChange} />
                  </div>
                </div>
              )}

              {(currentStep === 4 || mode === 'EDITOR') && (
                <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
                  <div className="flex justify-between items-center border-b pb-3">
                    <h3 className="font-bold text-slate-800 text-lg">4. House Rules & Safety</h3>
                    <button type="button" onClick={handleAddRule} className="text-[10px] font-black text-rose-500 bg-rose-50 px-4 py-1.5 rounded-full border border-rose-100 uppercase tracking-widest transition-all active:scale-95">+ Add Rule</button>
                  </div>
                  <div className="space-y-4">
                    {(activeGuide.houseRules || []).map((rule, idx) => (
                      <div key={idx} className="flex gap-2 animate-in slide-in-from-left duration-200">
                        <Input label={`Rule #${idx+1}`} value={rule} onChange={(e: any) => handleRuleChange(idx, e.target.value)} className="flex-1" />
                        <button type="button" onClick={() => handleRemoveRule(idx)} className="mt-6 p-2 text-slate-300 hover:text-rose-500 transition-colors">×</button>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                    <Input label="Emergency Contact" name="emergencyPhone" value={activeGuide.emergencyPhone} onChange={handleInputChange} />
                    <Input label="Property Contact" name="propertyContact" value={activeGuide.propertyContact} onChange={handleInputChange} />
                  </div>
                </div>
              )}

              {(currentStep === 5 || mode === 'EDITOR') && (
                <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
                  <h3 className="font-bold text-slate-800 border-b pb-3 text-lg">5. Local Recommendations</h3>
                  <div className="space-y-4">
                    <Input label="Best Local Restaurants" as="textarea" name="restaurants" placeholder="The Pizza Spot (2 min walk)..." value={activeGuide.restaurants} onChange={handleInputChange} />
                    <Input label="Top Local Activities" as="textarea" name="activities" placeholder="Hiking trails, Boat rentals..." value={activeGuide.activities} onChange={handleInputChange} />
                  </div>
                </div>
              )}

              {(currentStep === 6 || mode === 'EDITOR') && (
                <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
                  <div className="flex justify-between items-center border-b pb-3">
                    <h3 className="font-black text-slate-800 text-lg">6. Media Gallery</h3>
                    <button type="button" onClick={handleAddPhoto} className="text-[10px] font-black text-rose-500 bg-rose-50 px-4 py-1.5 rounded-full border border-rose-100 uppercase tracking-widest transition-all active:scale-95">+ Add Photo Slot</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(activeGuide.additionalPhotos || []).map((photo, idx) => (
                      <div key={idx} className="relative animate-in zoom-in duration-300">
                        <ImageUpload label={`Gallery Photo ${idx+1}`} value={photo} onChange={(v) => handlePhotoChange(idx, v)} />
                        <button type="button" onClick={() => handleRemovePhoto(idx)} className="absolute top-8 right-2 p-1 bg-white text-rose-500 rounded-lg shadow-md z-10">×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(currentStep === 7 || mode === 'EDITOR') && (
                <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
                  <div className="flex justify-between items-center border-b pb-3">
                    <h3 className="font-black text-slate-800 text-lg">7. Video Tutorials</h3>
                    <button type="button" onClick={handleAddVideo} className="text-[10px] font-black text-rose-500 bg-rose-50 px-4 py-1.5 rounded-full border border-rose-100 uppercase tracking-widest transition-all active:scale-95">+ Add Video</button>
                  </div>
                  {(activeGuide.videoGuides || []).map((v, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-2xl space-y-3 relative border border-slate-100 animate-in slide-in-from-left duration-200">
                      <button type="button" onClick={() => handleRemoveVideo(idx)} className="absolute top-2 right-2 text-slate-300 hover:text-rose-500">×</button>
                      <Input label="Tutorial Title" value={v.title} onChange={(e: any) => handleVideoChange(idx, 'title', e.target.value)} />
                      <Input label="YouTube URL" value={v.url} onChange={(e: any) => handleVideoChange(idx, 'url', e.target.value)} />
                    </div>
                  ))}
                </div>
              )}

              <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t p-4 no-print flex justify-center z-40">
                <div className="max-w-3xl w-full flex justify-between gap-4">
                  {(mode === 'ONBOARDING' && currentStep > 1) && <button type="button" onClick={prevStep} className="px-6 py-3 text-slate-500 font-bold hover:text-rose-600 transition-colors">Back</button>}
                  {mode === 'EDITOR' && <button type="button" onClick={() => setMode('DASHBOARD')} className="px-6 py-3 text-slate-500 font-bold hover:text-rose-600 transition-colors">Cancel</button>}
                  <div className="flex-1" />
                  {mode === 'ONBOARDING' && currentStep < totalSteps ? (
                    <button type="button" onClick={nextStep} className="bg-rose-500 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-rose-100 hover:bg-rose-600 transition-all">Continue</button>
                  ) : (
                    <button type="submit" disabled={isGenerating} className="bg-rose-500 text-white px-12 py-3 rounded-2xl font-bold shadow-lg shadow-rose-100 hover:bg-rose-600 disabled:opacity-50 transition-all">
                      {isGenerating ? 'Building...' : (mode === 'EDITOR' ? 'Save & Sync' : 'Generate App')}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        )}

        {mode === 'VIEWER' && <GuideViewer content={generatedContent || "{}"} propertyName={activeGuide.propertyName} onBack={() => setMode('DASHBOARD')} isGuestMode={false} />}
      </main>

      {selectedQRGuide && (
        <QRModal 
          isOpen={!!selectedQRGuide} 
          onClose={() => setSelectedQRGuide(null)} 
          propertyName={selectedQRGuide.propertyName}
          customUrl={`${window.location.origin}${window.location.pathname}?g=${selectedQRGuide.id}`}
        />
      )}
    </div>
  );
};

export default App;