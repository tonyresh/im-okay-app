
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Heart, 
  Users, 
  MessageSquare, 
  Settings, 
  Bell, 
  Trophy, 
  CheckCircle,
  Plus,
  Send,
  ChevronRight,
  ShieldAlert,
  Globe,
  ArrowLeft,
  Calendar,
  Zap,
  Search,
  Phone,
  Facebook,
  Twitter,
  Share2,
  UserPlus,
  Check,
  X,
  UserCheck,
  BellOff,
  AlertTriangle,
  Trash2,
  MoreHorizontal,
  Smile,
  Frown,
  Meh,
  ZapOff,
  CloudLightning,
  Sun,
  Copy,
  ExternalLink,
  PhoneCall,
  MessageCircle,
  UserCircle
} from 'lucide-react';
import { UserState, Language, UserStatus, Friend, Message, FriendRequest, Toast, MessengerLinks } from './types';
import { TRANSLATIONS, CHECKIN_TIMEOUT_WARNING, CHECKIN_TIMEOUT_ALERT, SHARE_TRANSLATIONS } from './constants';
import { getDailyAffirmation, getFriendSupportMessage } from './services/gemini';
import { GoogleGenAI } from "@google/genai";

// --- Local Storage Helpers ---
const STORAGE_KEY = 'im_okay_app_state_v3';

// Initialize the Gemini API client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MOODS = [
  { icon: '😊', label: 'Happy' },
  { icon: '😔', label: 'Sad' },
  { icon: '😴', label: 'Tired' },
  { icon: '😤', label: 'Stressed' },
  { icon: '🤔', label: 'Thinking' },
  { icon: '🥳', label: 'Energetic' }
];

const loadState = (): UserState => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return JSON.parse(saved);
  return {
    id: 'user_1',
    name: 'Alex',
    points: 0,
    streak: 0,
    highestStreak: 0,
    lastCheckIn: 0,
    language: Language.EN,
    friends: [
      { 
        id: 'f1', 
        name: 'Maria', 
        avatar: 'https://picsum.photos/seed/maria/200', 
        lastCheckIn: Date.now() - 10 * 60 * 60 * 1000, 
        status: UserStatus.SAFE, 
        points: 450, 
        mood: '😊',
        messengers: { phone: '+380991234567', telegram: 'maria_safety', whatsapp: '+380991234567' }
      },
      { 
        id: 'f2', 
        name: 'Ivan', 
        avatar: 'https://picsum.photos/seed/ivan/200', 
        lastCheckIn: Date.now() - 30 * 60 * 60 * 1000, 
        status: UserStatus.WARNING, 
        points: 1200, 
        mood: '😴',
        messengers: { phone: '+380997654321', viber: '+380997654321' }
      },
      { 
        id: 'f3', 
        name: 'Olena', 
        avatar: 'https://picsum.photos/seed/olena/200', 
        lastCheckIn: Date.now() - 50 * 60 * 60 * 1000, 
        status: UserStatus.ALERT, 
        points: 800, 
        mood: '😤',
        messengers: { facebook: 'olena.safety.official' }
      },
    ],
    messages: {},
    pendingRequests: [
      { id: 'r1', name: 'Taras', avatar: 'https://picsum.photos/seed/taras/200', timestamp: Date.now() - 3600000 }
    ],
    notificationsEnabled: false,
    isLoggedIn: true,
    mood: '😊',
    messengers: { phone: '+380990000000', telegram: 'alex_okay' },
    // Fix: Added missing VIP system properties required by the UserState interface
    isVip: false,
    coins: 0,
    level: 1,
    xp: 0
  };
};

const App: React.FC = () => {
  const [state, setState] = useState<UserState>(loadState());
  const [activeTab, setActiveTab] = useState<'dashboard' | 'friends' | 'chat' | 'settings'>('dashboard');
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [aiAffirmation, setAiAffirmation] = useState<string | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [isGeneratingSupport, setIsGeneratingSupport] = useState(false);
  const [isFriendTyping, setIsFriendTyping] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const t = useMemo(() => TRANSLATIONS[state.language], [state.language]);
  const st = useMemo(() => SHARE_TRANSLATIONS[state.language], [state.language]);

  const filteredFriends = useMemo(() => {
    return state.friends.filter(f => 
      f.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [state.friends, searchTerm]);

  // Dynamic streak formatting logic
  const formattedStreak = useMemo(() => {
    const s = state.streak;
    if (s < 7) return `${s} ${st.days}`;
    if (s < 30) return `${Math.floor(s / 7)} ${st.weeks}`;
    if (s < 365) return `${Math.floor(s / 30)} ${st.months}`;
    return `${Math.floor(s / 365)} ${st.years}`;
  }, [state.streak, st]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Streak expiry check: if more than 48h passed since last check-in, reset streak
  useEffect(() => {
    if (state.lastCheckIn !== 0 && Date.now() - state.lastCheckIn > CHECKIN_TIMEOUT_ALERT) {
      setState(prev => ({ ...prev, streak: 0 }));
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'chat' && activeChatId) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state.messages, isFriendTyping, activeTab, activeChatId]);

  const pushNotification = useCallback((title: string, message: string, type: 'info' | 'error' | 'success' = 'info', duration: number = 4000) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = { id, title, message, type };
    setToasts(prev => [...prev, newToast]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const handleCheckIn = async () => {
    const now = Date.now();
    const timeSinceLast = state.lastCheckIn === 0 ? Infinity : now - state.lastCheckIn;
    
    let newStreak = state.streak;
    if (timeSinceLast > CHECKIN_TIMEOUT_ALERT) {
      newStreak = 1; // Streak broken or first time
    } else {
      newStreak += 1;
    }

    setState(prev => ({ 
      ...prev, 
      lastCheckIn: now, 
      points: prev.points + 10,
      streak: newStreak,
      highestStreak: Math.max(prev.highestStreak, newStreak)
    }));

    const affirmation = await getDailyAffirmation(state.language);
    setAiAffirmation(affirmation);
    pushNotification(t.checkInButton, t.checkedIn, 'success');
  };

  const setMood = (moodIcon: string) => {
    setState(prev => ({ ...prev, mood: moodIcon }));
    pushNotification(t.appName, `Mood updated to ${moodIcon}`, 'info');
  };

  const toggleLanguage = () => {
    setState(prev => ({
      ...prev,
      language: prev.language === Language.EN ? Language.UA : Language.EN
    }));
  };

  const getStatus = (lastCheckIn: number): UserStatus => {
    const diff = Date.now() - lastCheckIn;
    if (diff > CHECKIN_TIMEOUT_ALERT) return UserStatus.ALERT;
    if (diff > CHECKIN_TIMEOUT_WARNING) return UserStatus.WARNING;
    return UserStatus.SAFE;
  };

  const getHoursSince = (timestamp: number) => Math.floor((Date.now() - timestamp) / (1000 * 60 * 60));

  const handleSendMessage = async (friendId: string, customText?: string) => {
    const textToUse = customText || chatInput;
    if (!textToUse.trim()) return;
    const newMessage: Message = { id: Math.random().toString(36).substr(2, 9), senderId: state.id, text: textToUse, timestamp: Date.now() };
    setState(prev => ({ ...prev, messages: { ...prev.messages, [friendId]: [...(prev.messages[friendId] || []), newMessage] } }));
    setChatInput('');
    const friend = state.friends.find(f => f.id === friendId);
    if (friend) {
      setTimeout(() => setIsFriendTyping(true), 800);
      try {
        const prompt = `You are ${friend.name}, a friend in a safety app. Respond to: "${textToUse}" in ${state.language}. Max 15 words. Mood: ${friend.mood}.`;
        const res = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        setTimeout(() => {
          setIsFriendTyping(false);
          const reply: Message = { id: Math.random().toString(36).substr(2, 9), senderId: friendId, text: res.text || "...", timestamp: Date.now() };
          setState(prev => ({ ...prev, messages: { ...prev.messages, [friendId]: [...(prev.messages[friendId] || []), reply] } }));
        }, 2000);
      } catch { setIsFriendTyping(false); }
    }
  };

  const handleDeleteFriend = (id: string) => {
    setState(prev => ({
      ...prev,
      friends: prev.friends.filter(f => f.id !== id)
    }));
    setSelectedFriendId(null);
    pushNotification(t.friends, "Friend removed", 'info');
  };

  const handleSendSupportMessage = async (friend: Friend) => {
    setIsGeneratingSupport(true);
    try {
      const hours = getHoursSince(friend.lastCheckIn);
      const message = await getFriendSupportMessage(friend.name, hours, state.language);
      await handleSendMessage(friend.id, message);
      setActiveTab('chat');
      setActiveChatId(friend.id);
      setSelectedFriendId(null);
    } catch (error) {
      console.error("Support message error:", error);
      pushNotification("Error", "Could not generate support message", "error");
    } finally {
      setIsGeneratingSupport(false);
    }
  };

  const handleCall = (method: string, value: string) => {
    let url = '';
    switch (method) {
      case 'phone': url = `tel:${value}`; break;
      case 'whatsapp': url = `https://wa.me/${value.replace(/\D/g, '')}`; break;
      case 'telegram': url = `https://t.me/${value.replace('@', '')}`; break;
      case 'viber': url = `viber://chat?number=${value.replace(/\D/g, '')}`; break;
      case 'facebook': url = `https://m.me/${value}`; break;
    }
    if (url) window.open(url, '_blank');
    setIsCallModalOpen(false);
  };

  const renderCallModal = () => {
    const friend = state.friends.find(f => f.id === selectedFriendId);
    if (!isCallModalOpen || !friend) return null;
    const ms = friend.messengers || {};
    const options = [
      { id: 'phone', icon: <Phone size={20} />, label: t.phone, value: ms.phone, color: 'bg-emerald-500' },
      { id: 'telegram', icon: <Send size={20} />, label: t.telegram, value: ms.telegram, color: 'bg-sky-500' },
      { id: 'whatsapp', icon: <MessageCircle size={20} />, label: t.whatsapp, value: ms.whatsapp, color: 'bg-green-500' },
      { id: 'viber', icon: <MessageSquare size={20} />, label: t.viber, value: ms.viber, color: 'bg-purple-500' },
      { id: 'facebook', icon: <Facebook size={20} />, label: t.facebook, value: ms.facebook, color: 'bg-blue-600' },
    ].filter(o => !!o.value);

    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-6 animate-in fade-in duration-300">
        <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 space-y-6 shadow-2xl animate-in zoom-in-95 duration-300">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-800">{t.chooseCallMethod}</h3>
            <button onClick={() => setIsCallModalOpen(false)} className="text-slate-400 p-1"><X size={20}/></button>
          </div>
          <div className="space-y-3">
            {options.map(opt => (
              <button 
                key={opt.id} 
                onClick={() => handleCall(opt.id, opt.value!)}
                className="w-full flex items-center space-x-4 p-4 rounded-2xl hover:bg-slate-50 border border-slate-100 transition-all group"
              >
                <div className={`${opt.color} p-3 rounded-xl text-white shadow-sm group-active:scale-90 transition-transform`}>{opt.icon}</div>
                <div className="text-left flex-1">
                  <p className="font-bold text-slate-800 text-sm">{opt.label}</p>
                  <p className="text-xs text-slate-400">{opt.value}</p>
                </div>
                <ChevronRight size={16} className="text-slate-300" />
              </button>
            ))}
            {options.length === 0 && <p className="text-center text-slate-400 py-4 text-sm">No messenger links available.</p>}
          </div>
        </div>
      </div>
    );
  };

  const renderEditProfile = () => {
    if (!isEditProfileOpen) return null;
    return (
      <div className="fixed inset-0 bg-slate-50 z-50 flex flex-col animate-in slide-in-from-bottom-full duration-500">
        <header className="p-6 flex items-center space-x-4 border-b bg-white">
          <button onClick={() => setIsEditProfileOpen(false)} className="p-2 text-slate-500"><ArrowLeft/></button>
          <h2 className="text-xl font-bold text-slate-800">{t.editProfile}</h2>
        </header>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <img src={`https://picsum.photos/seed/${state.id}/200`} className="w-24 h-24 rounded-3xl object-cover border-4 border-white shadow-md" />
              <div className="absolute -bottom-2 -right-2 bg-indigo-600 p-2 rounded-xl text-white shadow-lg"><Plus size={16}/></div>
            </div>
            <input 
              value={state.name} 
              onChange={e => setState(p => ({...p, name: e.target.value}))}
              className="text-center text-xl font-bold bg-transparent border-b-2 border-slate-100 focus:border-indigo-500 outline-none w-full max-w-[200px]"
            />
          </div>
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.linkedMessengers}</h3>
            {[
              { id: 'phone', label: t.phone, icon: <Phone size={18}/> },
              { id: 'telegram', label: t.telegram, icon: <Send size={18}/> },
              { id: 'whatsapp', label: t.whatsapp, icon: <MessageCircle size={18}/> },
              { id: 'viber', label: t.viber, icon: <MessageSquare size={18}/> },
              { id: 'facebook', label: t.facebook, icon: <Facebook size={18}/> },
            ].map(field => (
              <div key={field.id} className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 ml-1">{field.label}</label>
                <div className="flex items-center bg-white border border-slate-100 rounded-2xl px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-indigo-400 transition-all">
                  <div className="text-slate-400 mr-3">{field.icon}</div>
                  <input 
                    value={(state.messengers as any)[field.id] || ''} 
                    onChange={e => setState(p => ({...p, messengers: {...p.messengers, [field.id]: e.target.value}}))}
                    placeholder={`Enter ${field.label}`}
                    className="flex-1 bg-transparent outline-none text-sm text-slate-700"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="p-6 bg-white border-t">
          <button 
            onClick={() => {
              setIsEditProfileOpen(false);
              pushNotification("Successful!", "", 'success', 1000);
            }} 
            className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-100 active:scale-95 transition-all"
          >
            {t.save}
          </button>
        </div>
      </div>
    );
  };

  const renderFriendDetail = (friend: Friend) => {
    const status = getStatus(friend.lastCheckIn);
    const hours = getHoursSince(friend.lastCheckIn);
    return (
      <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 pb-10">
        <div className="flex justify-between items-center">
          <button onClick={() => setSelectedFriendId(null)} className="flex items-center space-x-2 text-slate-500"><ArrowLeft size={20} /><span>Back</span></button>
          <button onClick={() => handleDeleteFriend(friend.id)} className="p-2 text-rose-400"><Trash2 size={20} /></button>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center space-y-4">
          <div className="relative">
            <img src={friend.avatar} alt={friend.name} className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md" />
            <div className={`absolute bottom-1 right-1 w-6 h-6 rounded-full border-4 border-white ${status === UserStatus.SAFE ? 'bg-emerald-500' : status === UserStatus.WARNING ? 'bg-amber-500' : 'bg-rose-500'}`} />
            {friend.mood && <div className="absolute -top-1 -right-1 bg-white shadow-md rounded-full w-8 h-8 flex items-center justify-center text-xl border border-slate-50">{friend.mood}</div>}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{friend.name}</h2>
            <p className="text-slate-500 text-sm mt-1">{t.lastSeen} {hours === 0 ? t.now : `${hours} ${t.hoursAgo}`}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 w-full">
            <button 
              onClick={() => setIsCallModalOpen(true)}
              className="flex items-center justify-center space-x-2 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100"
            >
              <PhoneCall size={18} /><span>{t.call}</span>
            </button>
            <button 
              onClick={() => handleSendSupportMessage(friend)}
              disabled={isGeneratingSupport}
              className="flex items-center justify-center space-x-2 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
            >
              {isGeneratingSupport ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" /> : <MessageSquare size={18} />}
              <span>{t.chat}</span>
            </button>
          </div>
        </div>
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-slate-800 flex items-center space-x-2"><Calendar size={18} className="text-indigo-500" /><span>History</span></h3>
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden text-sm">
            {['Today', 'Yesterday', '2 days ago'].map((d, i) => (
              <div key={i} className="flex justify-between p-4 border-b last:border-0 border-slate-50">
                <p className="font-medium text-slate-700">{d}</p>
                <span className="text-xs font-bold px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md">OK</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderDashboard = () => {
    const isCheckedInToday = Date.now() - state.lastCheckIn < 24 * 60 * 60 * 1000;
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center space-y-6">
          <div className="relative group" onClick={() => setIsEditProfileOpen(true)}>
            <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-700 ${isCheckedInToday ? 'bg-emerald-100 scale-105' : 'bg-slate-100 animate-pulse'}`}>
               {isCheckedInToday ? <CheckCircle size={64} className="text-emerald-500" /> : <Heart size={64} className="text-slate-400" />}
            </div>
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/10 rounded-full transition-opacity cursor-pointer">
              <UserCircle className="text-white" size={32}/>
            </div>
            {state.mood && <div className="absolute -top-1 -right-1 bg-white shadow-md rounded-full w-10 h-10 flex items-center justify-center text-2xl border border-slate-50">{state.mood}</div>}
          </div>
          <div>
            <h2 className="text-3xl font-bold text-slate-800">{t.checkInButton}</h2>
            <p className="text-slate-500 mt-2">{isCheckedInToday ? t.checkedIn : t.encouragement}</p>
          </div>
          <div className="w-full flex space-x-3">
            <button onClick={handleCheckIn} disabled={isCheckedInToday} className={`flex-1 py-4 rounded-2xl font-bold text-lg shadow-lg transition-all ${isCheckedInToday ? 'bg-slate-200 text-slate-500' : 'bg-emerald-500 text-white shadow-emerald-200 active:scale-95'}`}>
              {isCheckedInToday ? t.checkedIn : t.checkInButton}
            </button>
            {isCheckedInToday && <button onClick={() => setIsShareModalOpen(true)} className="bg-indigo-600 text-white p-4 rounded-2xl shadow-lg shadow-indigo-100 active:scale-90 transition-all"><Share2 size={24} /></button>}
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
           <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2"><Smile size={18} className="text-indigo-500" /><span>{t.setMood}</span></h3>
           <div className="flex justify-between items-center px-1">
             {MOODS.map(m => (
               <button key={m.icon} onClick={() => setMood(m.icon)} className={`text-2xl w-10 h-10 rounded-xl flex items-center justify-center transition-all ${state.mood === m.icon ? 'bg-indigo-100 scale-125 shadow-sm' : 'hover:bg-slate-50'}`}>{m.icon}</button>
             ))}
           </div>
        </div>
        {aiAffirmation && (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-5 rounded-2xl border border-emerald-100 flex items-start space-x-4 animate-in zoom-in-95">
            <div className="bg-emerald-500 p-2 rounded-xl text-white"><ShieldAlert size={20} /></div>
            <div><p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">{t.aiSuggestion}</p><p className="text-slate-700 italic">"{aiAffirmation}"</p></div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center space-x-4">
            <div className="bg-amber-100 p-3 rounded-xl"><Trophy className="text-amber-600" size={24} /></div>
            <div>
              <p className="text-xs text-slate-500">{t.points}</p>
              <p className="text-lg font-bold text-slate-800">{state.points}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center space-x-4">
            <div className="bg-blue-100 p-3 rounded-xl"><Zap className="text-blue-600" size={24} /></div>
            <div>
              <p className="text-xs text-slate-500">{t.streak}</p>
              <p className="text-lg font-bold text-slate-800">{state.streak}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFriends = () => {
    if (selectedFriendId) return renderFriendDetail(state.friends.find(f => f.id === selectedFriendId)!);
    return (
      <div className="space-y-4 animate-in fade-in duration-500">
        <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold text-slate-800">{t.friends}</h2><button onClick={() => setIsAddingFriend(true)} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Plus size={24} /></button></div>
        <div className="relative mb-6"><div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400"><Search size={18} /></div><input type="text" placeholder="Search friends..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white border border-slate-100 rounded-2xl py-3 pl-11 pr-4 focus:ring-2 focus:ring-indigo-400 outline-none shadow-sm transition-all" /></div>
        <div className="space-y-3">
          {filteredFriends.map(friend => {
            const status = getStatus(friend.lastCheckIn);
            return (
              <div key={friend.id} onClick={() => setSelectedFriendId(friend.id)} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:border-indigo-200 transition-all cursor-pointer group">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <img src={friend.avatar} className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm" />
                    <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${status === UserStatus.SAFE ? 'bg-emerald-500' : status === UserStatus.WARNING ? 'bg-amber-500' : 'bg-rose-500'}`} />
                    {friend.mood && <div className="absolute -top-1 -right-1 bg-white shadow-sm rounded-full w-6 h-6 flex items-center justify-center text-[10px] border border-slate-50">{friend.mood}</div>}
                  </div>
                  <div><h3 className="font-bold text-slate-800 text-lg flex items-center">{friend.name}</h3><p className="text-xs text-slate-400">{t.lastSeen} {getHoursSince(friend.lastCheckIn) === 0 ? t.now : `${getHoursSince(friend.lastCheckIn)}h ago`}</p></div>
                </div>
                <div className="flex items-center space-x-2">
                  <button onClick={(e) => { e.stopPropagation(); setSelectedFriendId(friend.id); setIsCallModalOpen(true); }} className="p-3 bg-slate-50 rounded-xl text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 transition-all"><Phone size={18}/></button>
                  <ChevronRight className="text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" size={16} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const handleShareToSocial = async () => {
    const text = st.shareMessage(state.name, state.mood || '', formattedStreak);
    if (navigator.share) {
      try {
        await navigator.share({
          title: st.shareTitle,
          text: text,
          url: 'https://im-okay.app'
        });
      } catch (err) { console.error(err); }
    } else {
      navigator.clipboard.writeText(text);
      pushNotification(st.copied, "", 'success', 1500);
    }
  };

  const renderShareModal = () => {
    if (!isShareModalOpen) return null;
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-end justify-center animate-in fade-in duration-300">
        <div className="bg-white w-full max-w-md rounded-t-[2.5rem] p-8 space-y-8 animate-in slide-in-from-bottom-full duration-500">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-slate-800">{st.shareTitle}</h3>
            <button onClick={() => setIsShareModalOpen(false)} className="bg-slate-100 p-2 rounded-full text-slate-400"><X size={20} /></button>
          </div>
          
          <div className="bg-indigo-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-200">
            {/* Logo and Name added to card */}
            <div className="flex items-center space-x-2 mb-6 opacity-90">
              <div className="bg-white p-1.5 rounded-lg text-indigo-600">
                <Heart size={16} fill="currentColor" />
              </div>
              <span className="font-bold text-sm tracking-tight">{t.appName}</span>
            </div>

            <div className="relative z-10 space-y-4">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <img src={`https://picsum.photos/seed/${state.id}/200`} className="w-16 h-16 rounded-2xl border-2 border-white/20" />
                  <div className="absolute -top-1 -right-1 bg-white text-xl rounded-full w-8 h-8 flex items-center justify-center border-2 border-indigo-600">{state.mood}</div>
                </div>
                <div>
                  <h4 className="font-bold text-lg leading-tight">{state.name}</h4>
                  <p className="text-indigo-100 text-sm opacity-80">{st.imSafe}</p>
                </div>
              </div>
              
              <div className="pt-2 border-t border-white/10">
                <p className="text-4xl font-black tracking-tighter mb-1">
                  I'm Okay!
                </p>
                <p className="text-indigo-100/60 font-medium text-sm">
                  {formattedStreak} {state.language === Language.EN ? 'straight' : 'поспіль'}
                </p>
              </div>
            </div>
            
            <Heart className="absolute -right-8 -bottom-8 text-white/10 rotate-12" size={160} fill="currentColor" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button onClick={handleShareToSocial} className="flex items-center justify-center space-x-2 bg-indigo-600 text-white py-4 rounded-2xl font-bold active:scale-95 transition-all">
              <Share2 size={20} />
              <span>{st.shareAction}</span>
            </button>
            <button onClick={() => { 
              navigator.clipboard.writeText(st.shareMessage(state.name, state.mood || '', formattedStreak)); 
              pushNotification(st.copied, "", 'success', 1000); 
            }} className="flex items-center justify-center space-x-2 bg-slate-100 text-slate-700 py-4 rounded-2xl font-bold active:scale-95 transition-all">
              <Copy size={20} />
              <span>{st.copyLink}</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen max-w-md mx-auto bg-slate-50 relative flex flex-col font-sans shadow-2xl overflow-hidden">
      <div className="fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-xs z-[80] space-y-2 pointer-events-none px-4">
        {toasts.map(toast => (
          <div key={toast.id} className={`p-4 rounded-2xl shadow-xl border flex items-start space-x-3 animate-in slide-in-from-top-4 fade-in duration-300 pointer-events-auto ${toast.type === 'success' ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-white text-slate-800 border-slate-100'}`}>
            <div className="mt-0.5">{toast.type === 'success' ? <CheckCircle size={18} /> : <Bell size={18} className="text-indigo-500" />}</div>
            <div className="flex-1"><p className="font-bold text-sm leading-tight">{toast.title}</p><p className="text-xs opacity-90 mt-0.5">{toast.message}</p></div>
          </div>
        ))}
      </div>
      {renderShareModal()}
      {renderCallModal()}
      {renderEditProfile()}
      <header className="p-6 flex items-center justify-between sticky top-0 bg-slate-50/80 backdrop-blur-md z-20">
        <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setActiveTab('dashboard')}><div className="bg-indigo-600 p-2 rounded-xl text-white"><Heart size={20} fill="currentColor" /></div><h1 className="text-xl font-bold text-slate-800 tracking-tight">{t.appName}</h1></div>
        <div className="flex items-center space-x-3"><div className="bg-white border p-2 rounded-xl relative cursor-pointer" onClick={() => setActiveTab('friends')}><Bell size={20} className="text-slate-600" />{state.pendingRequests.length > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full border-2 border-white text-[10px] font-bold text-white flex items-center justify-center">{state.pendingRequests.length}</span>}</div><img src={`https://picsum.photos/seed/${state.id}/100`} onClick={() => setIsEditProfileOpen(true)} className="w-10 h-10 rounded-xl object-cover border-2 border-white shadow-sm cursor-pointer" /></div>
      </header>
      <main className="flex-1 px-6 pb-24 overflow-y-auto">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'friends' && renderFriends()}
        {activeTab === 'chat' && <div className="text-center py-20 text-slate-400">Chat history coming soon...</div>}
        {activeTab === 'settings' && <div className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-800">{t.settings}</h2>
          <button onClick={() => setIsEditProfileOpen(true)} className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm"><div className="flex items-center space-x-3 text-slate-700 font-medium"><UserCircle size={20}/><span>{t.editProfile}</span></div><ChevronRight size={18}/></button>
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="p-4 border-b flex justify-between"><span>{t.language}</span><button onClick={toggleLanguage} className="font-bold text-indigo-600">{state.language.toUpperCase()}</button></div>
          </div>
        </div>}
      </main>
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-100 px-6 py-3 flex justify-between items-center z-30 safe-area-inset-bottom">
        {[
          { id: 'dashboard', icon: Heart, label: t.dashboard },
          { id: 'friends', icon: Users, label: t.friends },
          { id: 'chat', icon: MessageSquare, label: t.chat },
          { id: 'settings', icon: Settings, label: 'Settings' }
        ].map(item => (
          <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`flex flex-col items-center space-y-1 ${activeTab === item.id ? 'text-indigo-600' : 'text-slate-400'}`}>
            <item.icon size={24} fill={activeTab === item.id ? 'currentColor' : 'none'} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default App;
