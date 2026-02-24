/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { 
  LayoutGrid, 
  Palette, 
  History, 
  Send, 
  Plus, 
  Download, 
  RefreshCw, 
  Check, 
  AlertCircle, 
  Image as ImageIcon,
  Type,
  Square,
  RectangleVertical,
  Monitor,
  LogOut,
  User,
  Copy,
  Instagram,
  Loader2,
  Sparkles,
  Zap,
  Smartphone,
  ChevronRight,
  Upload
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase, GEMINI_API_KEY } from './config';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

// --- Utilities ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
type Tab = 'geracao' | 'marca' | 'historico';
type Format = 'texto' | 'quadrado' | 'retrato' | 'story';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  credits_balance: number;
}

interface BrandSettings {
  colors: string[];
  logo_url: string;
  reference_images: string; // JSON string of URL array
  tone_of_voice: string;
  brand_personality: string;
  personality: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  timestamp: number;
}

// --- Components ---

const Toast = ({ message, type = 'success', onClose }: { message: string, type?: 'success' | 'error', onClose: () => void }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 20 }}
    className={cn(
      "fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 z-50",
      type === 'success' ? "bg-emerald-600" : "bg-red-600"
    )}
  >
    {type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
    <span className="text-sm font-medium">{message}</span>
    <button onClick={onClose} className="ml-2 hover:opacity-70"><Plus size={16} className="rotate-45" /></button>
  </motion.div>
);

export default function App() {
  // Auth State
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // App State
  const [activeTab, setActiveTab] = useState<Tab>('geracao');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [brand, setBrand] = useState<BrandSettings>({
    colors: ['#EA580C', '#f2f2f2'],
    logo_url: '',
    reference_images: '[]',
    tone_of_voice: 'Profissional',
    brand_personality: '',
    personality: ''
  });
  const [credits, setCredits] = useState(0);
  
  // Generation State
  const [selectedFormat, setSelectedFormat] = useState<Format>('quadrado');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Me diga o que você quer criar e eu gero a arte + legenda no seu estilo. Você só precisa configurar sua marca uma vez na aba "Marca".',
      timestamp: Date.now()
    }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastResult, setLastResult] = useState<{ imageUrl: string, caption: string } | null>(null);
  const [customTone, setCustomTone] = useState('');

  // History State
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [historyPage, setHistoryPage] = useState(0);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);

  // --- Persistent Chat Loading ---
  const loadChatHistory = async () => {
    if (!session) return;
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      if (data && data.length > 0) {
        setChatMessages(data.map(m => ({
          role: m.role,
          content: m.content,
          imageUrl: m.image_url,
          timestamp: new Date(m.created_at).getTime()
        })));
      }
    } catch (error) {
      console.error('Error loading chat:', error);
    }
  };

  // UI State
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        loadUserData(session.user.id);
        loadChatHistory();
        loadHistory(0);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        loadUserData(session.user.id);
        loadChatHistory();
        loadHistory(0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadUserData = async (userId: string) => {
    try {
      // Load Profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profileError) throw profileError;
      setProfile(profileData);
      setCredits(profileData.credits_balance);

      // Load Brand
      const { data: brandData, error: brandError } = await supabase
        .from('brand_settings')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (brandData) {
        setBrand(brandData);
      }
    } catch (error: any) {
      console.error('Error loading user data:', error);
      showToast('Erro ao carregar dados do usuário', 'error');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        showToast('Conta criada! Verifique seu e-mail.');
      }
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  const getCreditCost = (format: Format) => (format === 'texto' ? 2 : 10);

  const handleSendMessage = async () => {
    if (!userInput.trim() || isGenerating) return;

    const cost = getCreditCost(selectedFormat);
    if (credits < cost) {
      showToast('Créditos insuficientes. Adicione mais créditos para continuar.', 'error');
      return;
    }

    const userMsg: ChatMessage = { role: 'user', content: userInput, timestamp: Date.now() };
    setChatMessages(prev => [...prev, userMsg]);
    setUserInput('');
    setIsGenerating(true);
    setLastResult(null);

    try {
      // 1. Prepare Brand Data
      const brandInfo = {
        colors: brand.colors,
        tone: brand.tone_of_voice,
        personality: brand.personality || brand.brand_personality,
        logoUrl: brand.logo_url,
        refs: JSON.parse(brand.reference_images || '[]')
      };

      // 2. Fetch Images as Base64 for Gemini
      const fetchAsBase64 = async (url: string) => {
        if (!url) return null;
        const resp = await fetch(url);
        const blob = await resp.blob();
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(blob);
        });
      };

      const logoBase64 = brandInfo.logoUrl ? await fetchAsBase64(brandInfo.logoUrl) : null;
      const refsBase64 = await Promise.all(brandInfo.refs.map((url: string) => fetchAsBase64(url)));

      // 3. Build Gemini Request
      const formatLabels = {
        texto: 'caption only (no image)',
        quadrado: '1:1 square image',
        retrato: '3:4 portrait image',
        story: '9:16 story image'
      };

      const isTextOnly = selectedFormat === 'texto';

      const systemInstruction = isTextOnly 
        ? `You are a professional social media copywriter. Write a caption in Brazilian Portuguese for a brand with the following identity:
Colors: ${brandInfo.colors.join(', ')}. Tone of voice: ${brandInfo.tone}. Brand personality: ${brandInfo.personality}.
Include relevant hashtags matching the brand tone. DO NOT generate any image description or image content.`
        : `You are a professional social media designer. Generate a ${formatLabels[selectedFormat]} for a brand with the following identity:
Colors: ${brandInfo.colors.join(', ')}. Tone of voice: ${brandInfo.tone}. Brand personality: ${brandInfo.personality}.
The brand logo is included as a reference image — incorporate it visibly in the composition.
The other reference images show the brand's visual style — follow that aesthetic.
Also write a caption in Brazilian Portuguese with relevant hashtags matching the brand tone.
Return the image and then the caption text separated by "---CAPTION---".`;

      // Build Chat History for Context (Ensure it starts with 'user' and alternates)
      let historyContext = chatMessages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content || "..." }]
      }));

      // Remove leading 'model' messages
      while (historyContext.length > 0 && historyContext[0].role === 'model') {
        historyContext.shift();
      }

      // Ensure alternating roles
      const alternatingHistory: any[] = [];
      historyContext.forEach((msg) => {
        if (alternatingHistory.length === 0 || msg.role !== alternatingHistory[alternatingHistory.length - 1].role) {
          alternatingHistory.push(msg);
        }
      });
      
      // Take last few messages and ensure it ends with 'model' so current is 'user'
      let finalHistory = alternatingHistory.slice(-6);
      if (finalHistory.length > 0 && finalHistory[finalHistory.length - 1].role === 'user') {
        finalHistory.pop();
      }

      const lastMessageParts: any[] = [{ text: userInput }];
      if (!isTextOnly) {
        if (logoBase64) lastMessageParts.push({ inlineData: { mimeType: 'image/png', data: logoBase64 } });
        refsBase64.forEach(data => {
          if (data) lastMessageParts.push({ inlineData: { mimeType: 'image/png', data } });
        });
      }

      const imageConfigMap: Record<string, string> = {
        quadrado: '1:1',
        retrato: '3:4',
        story: '9:16'
      };

      const genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      
      const config: any = {
        systemInstruction: systemInstruction,
        generationConfig: {
          responseModalities: isTextOnly ? ["TEXT"] : ["TEXT", "IMAGE"]
        }
      };

      if (!isTextOnly) {
        config.imageConfig = {
          aspectRatio: imageConfigMap[selectedFormat] || '1:1'
        };
      }

      const result = await genAI.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: [
          ...finalHistory,
          { role: 'user', parts: lastMessageParts }
        ],
        config: config
      });

      const candidates = result.candidates?.[0]?.content?.parts || [];
      let caption = '';
      let imageBase64 = '';

      candidates.forEach((part: any) => {
        if (part.text) caption += part.text;
        if (part.inlineData) imageBase64 = part.inlineData.data;
      });

      // Clean up caption if it contains the separator
      if (caption.includes('---CAPTION---')) {
        caption = caption.split('---CAPTION---')[1].trim();
      }

      let imageUrl = '';
      if (imageBase64) {
        const blob = await (await fetch(`data:image/png;base64,${imageBase64}`)).blob();
        const timestamp = Date.now();
        const fileName = `${session.user.id}/${timestamp}.png`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('generated-arts')
          .upload(fileName, blob);
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('generated-arts')
          .getPublicUrl(fileName);
        
        imageUrl = publicUrl;
      }

      // 4. Deduct Credits
      const newBalance = credits - cost;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ credits_balance: newBalance })
        .eq('id', session.user.id);
      
      if (updateError) throw updateError;

      const { error: transError } = await supabase
        .from('credit_transactions')
        .insert({
          user_id: session.user.id,
          amount: -cost,
          description: `Geração de arte: ${selectedFormat}`
        });
      
      if (transError) throw transError;

      setCredits(newBalance);
      
      // 5. Save to Database
      const { error: dbError } = await supabase
        .from('generated_arts')
        .insert({
          user_id: session.user.id,
          image_url: imageUrl,
          caption: caption,
          format: selectedFormat,
          prompt: prompt,
          cost: cost
        });

      if (dbError) {
        console.error('Error saving to DB:', dbError);
      }

      // 6. Save Chat Messages to DB
      await supabase.from('chat_messages').insert([
        { user_id: session.user.id, role: 'user', content: prompt },
        { user_id: session.user.id, role: 'assistant', content: caption, image_url: imageUrl }
      ]);

      setLastResult({ imageUrl, caption });
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: caption,
        imageUrl,
        timestamp: Date.now()
      }]);

    } catch (error: any) {
      console.error('Generation error:', error);
      showToast(error.message || 'Erro ao gerar conteúdo', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveBrand = async () => {
    try {
      const { error } = await supabase
        .from('brand_settings')
        .upsert({
          id: session.user.id,
          ...brand,
          brand_personality: brand.personality, // Keep in sync
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      showToast('Marca salva com sucesso! ✓');
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const handleFileUpload = async (type: 'logo' | 'ref', index?: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const path = type === 'logo' 
          ? `brand-assets/${session.user.id}/logo` 
          : `brand-assets/${session.user.id}/ref-${index}`;
        
        const { error: uploadError } = await supabase.storage
          .from('brand-assets')
          .upload(path, file, { upsert: true });
        
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('brand-assets')
          .getPublicUrl(path);

        if (type === 'logo') {
          setBrand(prev => ({ ...prev, logo_url: publicUrl }));
        } else {
          const refs = JSON.parse(brand.reference_images || '[]');
          refs[index!] = publicUrl;
          setBrand(prev => ({ ...prev, reference_images: JSON.stringify(refs) }));
        }
      } catch (error: any) {
        showToast(error.message, 'error');
      }
    };
    input.click();
  };

  const loadHistory = async (page = 0) => {
    try {
      const { data, error } = await supabase
        .from('generated_arts')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .range(page * 12, (page + 1) * 12 - 1);
      
      if (error) throw error;

      const itemsWithUrls = data.map(item => ({
        ...item,
        url: item.image_url
      }));

      if (page === 0) {
        setHistoryItems(itemsWithUrls);
      } else {
        setHistoryItems(prev => [...prev, ...itemsWithUrls]);
      }
      
      setHasMoreHistory(data.length === 12);
      setHistoryPage(page);
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  useEffect(() => {
    if (activeTab === 'historico' && session) {
      loadHistory(0);
    }
  }, [activeTab, session]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-brand" size={48} />
          <p className="text-white/40 text-sm animate-pulse">Iniciando ambiente...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-8 text-center">
        <div className="max-w-md space-y-6">
          <div className="w-20 h-20 bg-brand/10 rounded-3xl flex items-center justify-center mx-auto text-brand">
            <Sparkles size={40} />
          </div>
          <h2 className="text-2xl font-bold">Acesso Restrito</h2>
          <p className="text-white/40 text-sm">
            Este gerador é exclusivo para assinantes Premium. Por favor, acesse através do seu painel principal.
          </p>
          <div className="pt-4">
            <button 
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-brand text-white font-bold rounded-xl shadow-lg shadow-brand/20"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-brand/30">
      <div className="max-w-[1200px] mx-auto p-8">
        {/* Left Column: Main Interface */}
        <div className="space-y-8">
          {/* Navigation Tabs Bar */}
          <div className="glass rounded-[32px] p-2 flex items-center gap-2 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
            <div className="flex-1 flex items-center gap-3 px-6">
              <div className="w-12 h-12 bg-brand/10 rounded-2xl flex items-center justify-center text-brand animate-pulse-neon">
                <Sparkles size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight">Geração Criativa</h3>
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-medium">AI Powered Engine</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-1.5 bg-black/40 rounded-[24px] border border-white/5">
              <button 
                onClick={() => setActiveTab('geracao')}
                className={cn(
                  "px-8 py-3 rounded-2xl text-sm font-bold transition-all duration-300 flex items-center gap-2",
                  activeTab === 'geracao' ? "btn-gradient text-white shadow-[0_0_20px_rgba(234,88,12,0.4)] scale-105" : "text-white/40 hover:text-white hover:bg-white/5"
                )}
              >
                <Zap size={16} />
                Gerar
              </button>
              <button 
                onClick={() => setActiveTab('marca')}
                className={cn(
                  "px-8 py-3 rounded-2xl text-sm font-bold transition-all duration-300 flex items-center gap-2",
                  activeTab === 'marca' ? "btn-gradient text-white shadow-[0_0_20px_rgba(234,88,12,0.4)] scale-105" : "text-white/40 hover:text-white hover:bg-white/5"
                )}
              >
                <Palette size={16} />
                Marca
              </button>
              <button 
                onClick={() => setActiveTab('historico')}
                className={cn(
                  "px-8 py-3 rounded-2xl text-sm font-bold transition-all duration-300 flex items-center gap-2",
                  activeTab === 'historico' ? "btn-gradient text-white shadow-[0_0_20px_rgba(234,88,12,0.4)] scale-105" : "text-white/40 hover:text-white hover:bg-white/5"
                )}
              >
                <History size={16} />
                Histórico
              </button>
            </div>

            <button 
              onClick={() => {
                setChatMessages([{ role: 'assistant', content: 'Me diga o que você quer criar e eu gero a arte + legenda no seu estilo. Você só precisa configurar sua marca uma vez na aba "Marca".', timestamp: Date.now() }]);
                setLastResult(null);
              }}
              className="w-12 h-12 flex items-center justify-center text-white/40 hover:text-brand hover:bg-brand/10 rounded-2xl transition-all ml-2 group"
              title="Resetar"
            >
              <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
            </button>
          </div>

          {/* Tab Content Area */}
          <div className="glass rounded-[48px] overflow-hidden min-h-[650px] flex flex-col shadow-2xl relative">
            <div className="absolute inset-0 bg-gradient-to-br from-brand/5 via-transparent to-transparent pointer-events-none" />
            <AnimatePresence mode="wait">
              {activeTab === 'geracao' && (
                <motion.div 
                  key="geracao"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  className="flex flex-col h-full relative z-10"
                >
                  {/* Format Selector Section */}
                  <div className="p-10 border-b border-white/5 bg-white/[0.02]">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="w-2 h-2 bg-brand rounded-full animate-pulse" />
                      <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white/40">Selecione o Formato</h4>
                    </div>
                    
                    <div className="flex flex-wrap gap-4">
                      {[
                        { id: 'texto', label: 'Texto IA', icon: <Type size={20} /> },
                        { id: 'quadrado', label: 'Quadrado', icon: <Square size={20} /> },
                        { id: 'retrato', label: 'Retrato (4:5)', icon: <Smartphone size={20} /> },
                        { id: 'story', label: 'Story (9:16)', icon: <Smartphone size={20} className="rotate-90" /> },
                      ].map((format) => (
                        <button
                          key={format.id}
                          onClick={() => setSelectedFormat(format.id as any)}
                          className={cn(
                            "group flex items-center gap-4 px-8 py-5 rounded-[24px] border transition-all duration-500 font-bold text-sm relative overflow-hidden",
                            selectedFormat === format.id 
                              ? "bg-brand/10 border-brand text-white shadow-[0_0_30px_rgba(234,88,12,0.2)]" 
                              : "bg-white/5 border-white/5 text-white/40 hover:border-white/20 hover:text-white hover:bg-white/10"
                          )}
                        >
                          <div className={cn(
                            "transition-transform duration-500 group-hover:scale-110",
                            selectedFormat === format.id ? "text-brand" : "text-white/40"
                          )}>
                            {format.icon}
                          </div>
                          {format.label}
                          {selectedFormat === format.id && (
                            <motion.div 
                              layoutId="format-glow"
                              className="absolute inset-0 bg-brand/5 blur-xl"
                            />
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="mt-6 flex items-center gap-4">
                      <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
                        Consumo: {selectedFormat === 'texto' ? '2' : '10'} Créditos
                      </p>
                      <div className="h-px flex-1 bg-white/5" />
                      <p className="text-[10px] font-bold text-brand/60 uppercase tracking-widest">
                        {brand.logo_url ? 'Logo Ativa ✓' : 'Sem Logo'} • {JSON.parse(brand.reference_images || '[]').filter(Boolean).length}/3 Referências
                      </p>
                    </div>
                  </div>

                  {/* Chat Area */}
                  <div className="flex-1 flex flex-col min-h-[450px]">
                    <div className="px-10 py-6 border-b border-white/5 bg-black/40 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-brand neon-border">
                          <Sparkles size={24} />
                        </div>
                        <div>
                          <h4 className="text-base font-bold tracking-tight">Assistente Criativo</h4>
                          <p className="text-[10px] text-white/40 font-medium uppercase tracking-wider">Conversational AI Interface</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-widest">Online</span>
                      </div>
                    </div>

                    <div className="flex-1 p-10 overflow-y-auto space-y-8 max-h-[550px] scrollbar-hide">
                      {chatMessages.map((msg, i) => (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          key={i} 
                          className={cn(
                            "flex flex-col max-w-[85%]",
                            msg.role === 'user' ? "ml-auto items-end" : "items-start"
                          )}
                        >
                          <div className={cn(
                            "px-8 py-5 rounded-[32px] text-sm leading-relaxed shadow-xl",
                            msg.role === 'user' 
                              ? "bg-brand text-white rounded-tr-none shadow-brand/10" 
                              : "glass text-white/90 rounded-tl-none border-white/10"
                          )}>
                            <div className="markdown-body">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                            {msg.imageUrl && (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="mt-6 rounded-[24px] overflow-hidden border border-white/10 shadow-2xl group relative"
                              >
                                <img src={msg.imageUrl} alt="Generated" className="max-w-full h-auto transition-transform duration-700 group-hover:scale-105" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                                  <p className="text-[10px] font-bold text-white uppercase tracking-widest">Preview Gerado</p>
                                </div>
                              </motion.div>
                            )}
                          </div>
                          <span className="text-[9px] font-bold text-white/20 mt-2 uppercase tracking-widest px-2">
                            {msg.role === 'user' ? 'Você' : 'AI Assistant'} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </motion.div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-10 bg-black/40 border-t border-white/5">
                      <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-brand/20 to-orange-400/20 rounded-[40px] blur opacity-0 group-focus-within:opacity-100 transition duration-1000" />
                        <textarea
                          value={userInput}
                          onChange={(e) => setUserInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          placeholder="Descreva sua ideia com detalhes... (ex: Post elegante para joalheria)"
                          className="relative w-full bg-black/60 border border-white/10 rounded-[36px] px-10 py-8 pr-24 text-sm focus:outline-none focus:border-brand/50 transition-all resize-none h-28 shadow-2xl placeholder:text-white/20"
                        />
                        <button 
                          onClick={handleSendMessage}
                          disabled={isGenerating || !userInput.trim()}
                          className="absolute right-6 bottom-6 w-16 h-16 btn-gradient text-white rounded-full flex items-center justify-center shadow-2xl shadow-brand/30 hover:scale-110 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 group"
                        >
                          {isGenerating ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'marca' && (
                <motion.div 
                  key="marca"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="p-12 space-y-12 relative z-10"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight">DNA da Marca</h2>
                      <p className="text-xs text-white/40 mt-1 uppercase tracking-widest font-bold">Configure a identidade visual e verbal</p>
                    </div>
                    <div className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-brand neon-border">
                      <Palette size={24} />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <section className="space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 bg-brand rounded-full" />
                        <label className="text-xs font-black uppercase tracking-[0.2em] text-white/40">Identidade Visual</label>
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Logo Master</p>
                          <button 
                            onClick={() => handleFileUpload('logo')}
                            className="w-full aspect-video glass rounded-[24px] flex flex-col items-center justify-center gap-3 hover:bg-white/10 transition-all overflow-hidden group relative"
                          >
                            {brand.logo_url ? (
                              <img src={brand.logo_url} className="w-full h-full object-contain p-6 transition-transform duration-500 group-hover:scale-110" alt="Logo" />
                            ) : (
                              <>
                                <Upload size={24} className="text-white/20 group-hover:text-brand transition-colors" />
                                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Upload PNG</span>
                              </>
                            )}
                          </button>
                        </div>
                        <div className="space-y-3">
                          <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Paleta de Cores</p>
                          <input 
                            type="text" 
                            placeholder="#HEX, #HEX"
                            value={Array.isArray(brand.colors) ? brand.colors.join(', ') : brand.colors}
                            onChange={(e) => setBrand(prev => ({ ...prev, colors: e.target.value.split(',').map(c => c.trim()) }))}
                            className="w-full glass rounded-[20px] px-6 py-4 text-sm focus:outline-none focus:border-brand/50 transition-all font-mono"
                          />
                          <div className="flex gap-1.5">
                            {(Array.isArray(brand.colors) ? brand.colors : []).slice(0, 5).map((c, i) => (
                              <div key={i} className="w-4 h-4 rounded-full border border-white/10 shadow-lg" style={{ backgroundColor: c }} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 bg-brand rounded-full" />
                        <label className="text-xs font-black uppercase tracking-[0.2em] text-white/40">Moodboard de Estilo</label>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        {[0, 1, 2].map(i => (
                          <button 
                            key={i}
                            onClick={() => handleFileUpload('ref', i)}
                            className="aspect-square glass rounded-[24px] flex items-center justify-center hover:bg-white/10 transition-all overflow-hidden group relative"
                          >
                            {JSON.parse(brand.reference_images || '[]')[i] ? (
                              <img src={JSON.parse(brand.reference_images || '[]')[i]} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-120" alt="Ref" />
                            ) : (
                              <Plus size={24} className="text-white/20 group-hover:text-brand transition-colors" />
                            )}
                          </button>
                        ))}
                      </div>
                    </section>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <section className="space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 bg-brand rounded-full" />
                        <label className="text-xs font-black uppercase tracking-[0.2em] text-white/40">Tom de Voz</label>
                      </div>
                      <div className="space-y-4">
                        <div className="relative">
                          <select 
                            value={['Profissional', 'Amigável', 'Motivador', 'Divertido'].includes(brand.tone_of_voice) ? brand.tone_of_voice : 'Personalizado'}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === 'Personalizado') {
                                setBrand(prev => ({ ...prev, tone_of_voice: customTone || 'Personalizado' }));
                              } else {
                                setBrand(prev => ({ ...prev, tone_of_voice: val }));
                              }
                            }}
                            className="w-full glass rounded-[24px] px-8 py-5 text-sm focus:outline-none focus:border-brand/50 appearance-none cursor-pointer font-bold"
                          >
                            <option value="Profissional" className="bg-[#1a1a1a]">Profissional</option>
                            <option value="Amigável" className="bg-[#1a1a1a]">Amigável</option>
                            <option value="Motivador" className="bg-[#1a1a1a]">Motivador</option>
                            <option value="Divertido" className="bg-[#1a1a1a]">Divertido</option>
                            <option value="Personalizado" className="bg-[#1a1a1a]">Personalizado</option>
                          </select>
                          <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                            <ChevronRight size={16} className="rotate-90" />
                          </div>
                        </div>

                        <AnimatePresence>
                          {(!['Profissional', 'Amigável', 'Motivador', 'Divertido'].includes(brand.tone_of_voice) || brand.tone_of_voice === 'Personalizado') && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="relative">
                                <input 
                                  type="text"
                                  maxLength={15}
                                  placeholder="Defina seu tom (ex: Rebelde)"
                                  value={brand.tone_of_voice === 'Personalizado' ? customTone : brand.tone_of_voice}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setCustomTone(val);
                                    setBrand(prev => ({ ...prev, tone_of_voice: val }));
                                  }}
                                  className="w-full glass rounded-[20px] px-6 py-4 text-sm focus:outline-none focus:border-brand/50 transition-all font-bold placeholder:text-white/20"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white/20 uppercase">
                                  {brand.tone_of_voice.length}/15
                                </span>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </section>

                    <section className="space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 bg-brand rounded-full" />
                        <label className="text-xs font-black uppercase tracking-[0.2em] text-white/40">Personalidade da Marca</label>
                      </div>
                      <textarea 
                        placeholder="Descreva a alma da sua marca... (ex: Inovadora, disruptiva e focada em tecnologia de ponta)"
                        value={brand.personality}
                        onChange={(e) => setBrand(prev => ({ ...prev, personality: e.target.value }))}
                        className="w-full glass rounded-[24px] px-8 py-6 text-sm focus:outline-none focus:border-brand/50 h-36 resize-none shadow-inner placeholder:text-white/20"
                      />
                    </section>
                  </div>

                  <button 
                    onClick={handleSaveBrand}
                    className="w-full btn-gradient text-white font-black py-6 rounded-[28px] shadow-2xl shadow-brand/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-sm"
                  >
                    <Check size={20} />
                    Consolidar DNA da Marca
                  </button>
                </motion.div>
              )}

              {activeTab === 'historico' && (
                <motion.div 
                  key="historico"
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-12 space-y-10 relative z-10"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight">Arquivo de Criações</h2>
                      <p className="text-xs text-white/40 mt-1 uppercase tracking-widest font-bold">Histórico completo de gerações</p>
                    </div>
                    <div className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-brand neon-border">
                      <History size={24} />
                    </div>
                  </div>

                  {historyItems.length === 0 ? (
                    <div className="py-40 text-center space-y-6">
                      <div className="w-24 h-24 glass rounded-full flex items-center justify-center mx-auto animate-float">
                        <ImageIcon className="text-white/10" size={48} />
                      </div>
                      <p className="text-sm font-bold text-white/20 uppercase tracking-[0.3em]">Nenhum registro encontrado</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {historyItems.map((item, i) => (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          key={i} 
                          className="group glass rounded-[32px] border-white/5 overflow-hidden flex flex-col shadow-2xl hover:neon-border transition-all duration-500"
                        >
                          <div className="aspect-square relative overflow-hidden bg-black/40">
                            {item.url ? (
                              <img src={item.url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="History" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white/5">
                                <Type size={64} />
                              </div>
                            )}
                            <div className="absolute top-4 right-4 px-4 py-2 bg-black/80 backdrop-blur-md rounded-full text-[10px] font-black text-brand border border-brand/20 shadow-xl">
                              -{item.cost || 10} CRÉDITOS
                            </div>
                          </div>
                          <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-brand uppercase tracking-widest">{item.format}</span>
                              <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{new Date(item.created_at).toLocaleDateString()}</span>
                            </div>
                            <p className="text-xs text-white/60 line-clamp-2 italic font-medium leading-relaxed">"{item.prompt}"</p>
                            <div className="flex gap-3 pt-2">
                              <button 
                                onClick={() => {
                                  setLastResult({ imageUrl: item.image_url, caption: item.caption });
                                  setActiveTab('geracao');
                                }}
                                className="flex-1 py-3 glass hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                              >
                                Detalhes
                              </button>
                              {item.url && (
                                <a 
                                  href={item.url} 
                                  download 
                                  className="p-3 glass hover:bg-brand hover:text-white rounded-2xl transition-all group/btn"
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <Download size={16} className="group-hover/btn:scale-110 transition-transform" />
                                </a>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                  
                  {hasMoreHistory && historyItems.length > 0 && (
                    <button 
                      onClick={() => loadHistory(historyPage + 1)}
                      className="w-full py-6 glass hover:bg-white/5 rounded-[28px] text-xs font-black uppercase tracking-[0.3em] text-white/40 hover:text-white transition-all border-white/5"
                    >
                      Carregar mais resultados
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Result Overlay (When an image is generated) */}
      <AnimatePresence>
        {lastResult && activeTab === 'geracao' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <div className="max-w-4xl w-full bg-[#141414] rounded-[40px] border border-white/10 overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]">
              <div className="flex-1 bg-black/40 flex items-center justify-center p-8">
                {lastResult.imageUrl ? (
                  <img src={lastResult.imageUrl} className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" alt="Result" />
                ) : (
                  <div className="flex flex-col items-center text-white/20">
                    <Type size={80} />
                    <p className="mt-4 font-bold">Legenda Gerada</p>
                  </div>
                )}
              </div>
              <div className="w-full md:w-[400px] p-8 flex flex-col border-l border-white/5">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-white/40">Resultado</h4>
                  <button onClick={() => setLastResult(null)} className="p-2 hover:bg-white/5 rounded-full transition-all">
                    <Plus size={24} className="rotate-45" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto mb-6">
                  <div className="p-6 bg-white/5 rounded-3xl border border-white/5 text-sm leading-relaxed text-white/80 markdown-body">
                    <ReactMarkdown>{lastResult.caption}</ReactMarkdown>
                  </div>
                </div>

                <div className="space-y-3">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(lastResult.caption);
                      showToast('Legenda copiada!');
                    }}
                    className="w-full py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-bold border border-white/10 transition-all flex items-center justify-center gap-2"
                  >
                    <Copy size={16} />
                    Copiar Legenda
                  </button>
                  {lastResult.imageUrl && (
                    <a 
                      href={lastResult.imageUrl} 
                      download 
                      className="w-full py-4 bg-brand text-white rounded-2xl text-xs font-bold shadow-lg shadow-brand/20 hover:bg-brand/90 transition-all flex items-center justify-center gap-2"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Download size={16} />
                      Baixar Arte
                    </a>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
