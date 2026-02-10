import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Heart, 
  Users, 
  MessageSquare, 
  Settings, 
  Bell, 
  CheckCircle,
  Search,
  Share2,
  UserPlus,
  Check,
  X,
  AlertTriangle,
  Coins,
  ShoppingBag,
  Zap,
  Sparkles,
  Award,
  Download,
  FileCode,
  Globe,
  Ghost,
  Shield,
  Map,
  Eye,
  Palette,
  BarChart3,
  Medal,
  Clock
} from 'lucide-react';
import { UserState, Language, UserStatus, Friend, FriendRequest, Toast } from './types';
import { TRANSLATIONS, CHECKIN_TIMEOUT_WARNING, CHECKIN_TIMEOUT_ALERT, SHARE_TRANSLATIONS, SHOP_ITEMS } from './constants';
import { getDailyAffirmation } from './services/gemini';

const STORAGE_KEY = 'im_okay_app_state_v7';

const loadState = (): UserState => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return JSON.parse(saved);
  return {
    id: 'user_1',
    name: 'Alex',
    points: 120,
    streak: 3,
    highestStreak: 12,
    lastCheckIn: Date.now() - 2 * 60 * 60 * 1000,
    language: Language.EN,
    friends: [
      { id: 'f1', name: 'Maria', avatar: 'https://picsum.photos/seed/maria/200', lastCheckIn: Date.now() - 10 * 60 * 60 * 1000, status: UserStatus.SAFE, points: 450, mood: '😊' },
      { id: 'f2', name: 'Ivan', avatar: 'https://picsum.photos/seed/ivan/200', lastCheckIn: Date.now() - 50 * 60 * 60 * 1000, status: UserStatus.ALERT, points: 210, mood: '😴' }
    ],
    messages: {},
    pendingRequests: [
      { id: 'r1', name: 'Taras', avatar: 'https://picsum.photos/seed/taras/200', timestamp: Date.now() - 3600000 }
    ],
    notificationsEnabled: true,
    isLoggedIn: true,
    mood: '😊',
    messengers: { phone: '+380990000000', telegram: 'alex_okay' },
    isVip: false,
    coins: 450,
    level: 3,
    xp: 65,
    unlockedFeatures: []
  };
};

const App: React.FC = () => {
  const [state, setState] = useState<UserState>(loadState());
  const [activeTab, setActiveTab] = useState<'dashboard' | 'friends' | 'shop' | 'settings'>('dashboard');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState(state.name);
  const [searchTerm, setSearchTerm] = useState('');
  const [aiAffirmation, setAiAffirmation] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const t = useMemo(() => TRANSLATIONS[state.language], [state.language]);
  const st = useMemo(() => SHARE_TRANSLATIONS[state.language], [state.language]);

  const filteredFriends = useMemo(() => state.friends.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase())), [state.friends, searchTerm]);
  const xpForNextLevel = useMemo(() => state.level * 100, [state.level]);
  const xpProgress = useMemo(() => (state.xp / xpForNextLevel) * 100, [state.xp, xpForNextLevel]);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);

  const pushNotification = useCallback((title: string, message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const handleCheckIn = async () => {
    const now = Date.now();
    let newStreak = state.streak + 1;
    let awardedXp = 50;
    let awardedCoins = state.unlockedFeatures.includes('vip') ? 50 : 25;
    let newXp = state.xp + awardedXp;
    let newLevel = state.level;
    
    if (newXp >= xpForNextLevel) {
      newXp -= xpForNextLevel;
      newLevel += 1;
      pushNotification(t.levelUp, `${t.level} ${newLevel}!`, 'success');
    }

    setState(prev => ({ 
      ...prev, lastCheckIn: now, points: prev.points + 10, streak: newStreak, 
      xp: newXp, level: newLevel, coins: prev.coins + awardedCoins 
    }));

    pushNotification(t.checkInButton, `+${awardedCoins} ${t.coins}!`, 'success');
    const affirmation = await getDailyAffirmation(state.language);
    setAiAffirmation(affirmation);
  };

  const handleBuyItem = (item: typeof SHOP_ITEMS[0]) => {
    if (state.unlockedFeatures.includes(item.id)) return;
    if (state.coins < item.price) {
      pushNotification(t.notEnoughCoins, t.insufficientFunds, 'error');
      return;
    }
    setState(prev => ({
      ...prev,
      coins: prev.coins - item.price,
      unlockedFeatures: [...prev.unlockedFeatures, item.id]
    }));
    pushNotification(t.shop, `${state.language === Language.EN ? item.nameEn : item.nameUa} ${t.unlocked}!`, 'success');
  };

  const handleExportProject = () => {
    const projectFiles = {
      "README.md": `# I'm Okay! Safety App\n\nBuild with React, Tailwind, and Gemini AI.`,
      "package.json": `{\n  "name": "im-okay-app",\n  "version": "1.0.0",\n  "dependencies": {\n    "react": "^19.0.0",\n    "@google/genai": "^1.40.0",\n    "lucide-react": "latest"\n  }\n}`,
      "user_state.json": JSON.stringify(state, null, 2)
    };
    
    const blob = new Blob([JSON.stringify(projectFiles, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `im_okay_project_files_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    pushNotification("Export", "Project files ready for GitHub!", "success");
  };

  const renderDashboard = () => {
    const isCheckedInToday = Date.now() - state.lastCheckIn < 24 * 60 * 60 * 1000;
    return (
      <div className="space-y-6 animate-in fade-in duration-700 pb-20">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
              {t.welcomeMessage}, {state.name}!
            </h1>
            <p className="text-slate-400 text-sm font-semibold">{t.encouragement}</p>
          </div>
          <div className="relative group cursor-pointer" onClick={() => setIsEditProfileOpen(true)}>
            <img 
              src={`https://picsum.photos/seed/${state.id}/100`} 
              className={`w-16 h-16 rounded-[1.5rem] object-cover border-4 border-white shadow-xl transition-all group-hover:scale-105 ${state.unlockedFeatures.includes('gold') ? 'ring-4 ring-amber-400 animate-pulse' : ''}`} 
            />
            <div className="absolute -bottom-1 -right-1 bg-white shadow-lg rounded-xl w-8 h-8 flex items-center justify-center text-lg border border-slate-50">{state.mood}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm text-center">
            <Zap size={22} className="mx-auto text-blue-500 mb-1" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.streak}</p>
            <p className="text-xl font-black text-slate-900">{state.streak}</p>
          </div>
          <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm text-center">
            <Award size={22} className="mx-auto text-indigo-500 mb-1" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lv.{state.level}</p>
            <p className="text-xl font-black text-slate-900">{Math.round(xpProgress)}%</p>
          </div>
          <div className="bg-amber-50 p-4 rounded-[2rem] border border-amber-100 shadow-sm text-center cursor-pointer active:scale-95 transition-all" onClick={() => setActiveTab('shop')}>
            <Coins size={22} className="mx-auto text-amber-500 mb-1" />
            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">{t.coins}</p>
            <p className="text-xl font-black text-amber-800">{state.coins}</p>
          </div>
        </div>

        <div className="relative bg-white rounded-[3rem] p-10 shadow-2xl shadow-indigo-100 border border-slate-50 flex flex-col items-center overflow-hidden">
          <div className="absolute -top-10 -right-10 opacity-5 text-indigo-600">
             <Heart size={240} fill="currentColor" className="rotate-12" />
          </div>

          <div className="relative z-10 flex flex-col items-center w-full space-y-8">
            <div className={`w-44 h-44 rounded-full flex items-center justify-center transition-all duration-700 relative ${isCheckedInToday ? 'bg-emerald-50' : 'bg-indigo-50 animate-pulse-ring'}`}>
              {isCheckedInToday ? (
                <CheckCircle size={90} className="text-emerald-500 drop-shadow-lg" />
              ) : (
                <Heart size={90} className="text-indigo-600 animate-float" fill="currentColor" />
              )}
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-3xl font-black text-slate-900">{isCheckedInToday ? t.checkedIn : t.checkInButton}</h3>
              <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-[200px]">
                {aiAffirmation || "One tap to keep your loved ones at peace."}
              </p>
            </div>

            <button 
              onClick={handleCheckIn} 
              disabled={isCheckedInToday} 
              className={`w-full py-6 rounded-[2rem] font-black text-2xl shadow-xl transition-all active:scale-95 ${isCheckedInToday ? 'bg-slate-100 text-slate-400' : 'bg-indigo-600 text-white shadow-indigo-300 hover:bg-indigo-700'}`}
            >
              {isCheckedInToday ? t.checkedIn : t.checkInButton}
            </button>
            
            {isCheckedInToday && (
              <button className="flex items-center space-x-2 text-indigo-600 font-bold bg-indigo-50/50 px-8 py-3 rounded-full hover:bg-indigo-50 transition-colors">
                <Share2 size={18} />
                <span>{st.shareAction}</span>
              </button>
            )}
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-2">
              <Sparkles size={18} className="text-amber-400" />
              <span className="text-[11px] font-black uppercase tracking-widest opacity-60">Journey to Level {state.level + 1}</span>
            </div>
            <span className="text-xs font-bold">{state.xp} / {xpForNextLevel} XP</span>
          </div>
          <div className="h-3 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-400 shadow-[0_0_20px_rgba(129,140,248,0.6)] transition-all duration-1000" style={{ width: `${xpProgress}%` }} />
          </div>
        </div>
      </div>
    );
  };

  const renderShop = () => (
    <div className="space-y-6 animate-in slide-in-from-right-8 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-900">{t.shop}</h2>
        <div className="bg-amber-100 px-5 py-2.5 rounded-2xl flex items-center space-x-2 shadow-sm">
          <Coins size={20} className="text-amber-600" />
          <span className="font-black text-amber-700 text-lg">{state.coins}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {SHOP_ITEMS.map((item, idx) => {
          const isOwned = state.unlockedFeatures.includes(item.id);
          const ItemIcon = [Ghost, Shield, Medal, Award, Sparkles, Map, Eye, Palette, BarChart3, Medal][idx] || Sparkles;
          
          return (
            <div 
              key={item.id} 
              className={`p-6 rounded-[2.5rem] border transition-all duration-300 ${isOwned ? 'bg-slate-50 border-slate-100 grayscale-[0.5]' : 'bg-white border-slate-100 shadow-md hover:shadow-lg'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-5">
                  <div className={`w-16 h-16 rounded-[1.75rem] flex items-center justify-center shadow-inner ${isOwned ? 'bg-slate-200 text-slate-400' : 'bg-indigo-50 text-indigo-600'}`}>
                    <ItemIcon size={32} />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-lg leading-tight">{state.language === Language.EN ? item.nameEn : item.nameUa}</h4>
                    <p className="text-xs font-bold text-slate-400 mt-1">{state.language === Language.EN ? item.descEn : item.descUa}</p>
                  </div>
                </div>
                {isOwned ? (
                  <div className="bg-emerald-100 text-emerald-600 p-3 rounded-2xl">
                    <Check size={24} strokeWidth={3} />
                  </div>
                ) : (
                  <button 
                    onClick={() => handleBuyItem(item)}
                    className="flex flex-col items-center bg-indigo-600 text-white px-6 py-3 rounded-[1.5rem] shadow-lg shadow-indigo-100 active:scale-90 transition-all"
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">{t.buy}</span>
                    <div className="flex items-center space-x-1.5 font-black text-lg">
                      <Coins size={16} />
                      <span>{item.price}</span>
                    </div>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderFriends = () => (
    <div className="space-y-6 animate-in fade-in pb-20">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-slate-900">{t.friends}</h2>
        <button className="p-4 bg-indigo-600 text-white rounded-[1.5rem] shadow-xl active:scale-90 transition-all">
          <UserPlus size={24} />
        </button>
      </div>
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
          <Search size={20} />
        </div>
        <input 
          type="text" 
          placeholder={t.addFriend + "..."} 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)} 
          className="w-full bg-white border border-slate-100 rounded-3xl py-5 pl-14 pr-6 focus:ring-4 focus:ring-indigo-50 outline-none shadow-sm transition-all font-bold text-slate-800" 
        />
      </div>
      <div className="space-y-4">
        {filteredFriends.map(friend => (
          <div key={friend.id} className={`bg-white p-5 rounded-[2.5rem] border border-slate-100 flex items-center justify-between transition-all hover:scale-[1.02] ${friend.status === UserStatus.ALERT ? 'ring-2 ring-rose-500/20' : ''}`}>
            <div className="flex items-center space-x-5">
              <div className="relative">
                <img src={friend.avatar} className={`w-16 h-16 rounded-[1.5rem] object-cover border-4 border-white shadow-lg ${friend.status === UserStatus.ALERT ? 'grayscale' : ''}`} />
                <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-white shadow-md ${friend.status === UserStatus.SAFE ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              </div>
              <div className="space-y-0.5">
                <h4 className="font-black text-slate-900 text-lg leading-none">{friend.name}</h4>
                <div className="flex items-center space-x-1 text-slate-400">
                  <Clock size={12} />
                  <p className="text-[11px] font-bold uppercase tracking-wider">
                    {friend.status === UserStatus.SAFE ? 'Connected' : 'Alert Sent'}
                  </p>
                </div>
              </div>
            </div>
            <button className={`p-4 rounded-2xl transition-all active:scale-90 ${friend.status === UserStatus.ALERT ? 'bg-rose-600 text-white shadow-rose-200' : 'bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}>
              <MessageSquare size={20} fill={friend.status === UserStatus.ALERT ? 'currentColor' : 'none'} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-8 animate-in slide-in-from-bottom-8 pb-24">
      <h2 className="text-2xl font-black text-slate-900">{t.settings}</h2>
      
      <div className="bg-indigo-600 p-8 rounded-[3rem] text-white shadow-2xl shadow-indigo-200 relative overflow-hidden group">
         <div className="relative z-10 flex flex-col items-center text-center space-y-5">
            <div className="bg-white/20 p-5 rounded-[2rem] group-hover:scale-110 transition-transform">
               <Download size={40} />
            </div>
            <div className="space-y-1">
               <h3 className="text-2xl font-black tracking-tight">{t.exportProject}</h3>
               <p className="text-indigo-100 text-sm font-semibold opacity-80">{t.backupDesc}</p>
            </div>
            <button 
               onClick={handleExportProject}
               className="w-full bg-white text-indigo-600 py-5 rounded-2xl font-black text-lg active:scale-95 transition-all shadow-xl hover:bg-indigo-50"
            >
               {state.language === Language.EN ? "Prepare Repository" : "Підготувати репозиторій"}
            </button>
         </div>
         <FileCode className="absolute -bottom-8 -right-8 text-white/10 rotate-12" size={160} />
      </div>

      <div className="space-y-4">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
              <Globe size={24} />
            </div>
            <div>
              <p className="font-black text-slate-900">{t.language}</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{state.language}</p>
            </div>
          </div>
          <button onClick={() => setState(p => ({...p, language: p.language === Language.EN ? Language.UA : Language.EN}))} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-xs active:scale-95 transition-all">
            {state.language === Language.EN ? "Українська" : "English"}
          </button>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all" onClick={() => setIsEditProfileOpen(true)}>
          <div className="flex items-center space-x-4">
             <div className="p-4 bg-slate-50 text-slate-500 rounded-2xl"><Settings size={24}/></div>
             <div>
               <p className="font-black text-slate-900">{t.editProfile}</p>
               <p className="text-xs font-bold text-slate-400 uppercase">Manage account</p>
             </div>
          </div>
          <CheckCircle size={24} className="text-emerald-500" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen max-w-md mx-auto bg-slate-50 relative flex flex-col font-sans shadow-2xl overflow-hidden ring-1 ring-slate-200">
      {/* Dynamic Background Elements */}
      <div className="fixed top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-50/50 to-transparent pointer-events-none" />

      {/* Toasts */}
      <div className="fixed top-8 left-1/2 -translate-x-1/2 w-full max-w-xs z-[100] space-y-3 pointer-events-none px-4">
        {toasts.map(toast => (
          <div key={toast.id} className={`p-5 rounded-[1.5rem] shadow-2xl border flex items-start space-x-4 animate-in slide-in-from-top-6 fade-in duration-500 pointer-events-auto ${toast.type === 'success' ? 'bg-slate-900 text-white border-slate-800' : toast.type === 'error' ? 'bg-rose-600 text-white border-rose-500' : 'bg-white text-slate-900 border-slate-100'}`}>
            <div className="mt-1">
              {toast.type === 'success' ? <Sparkles size={20} className="text-amber-400" /> : toast.type === 'error' ? <AlertTriangle size={20} /> : <Bell size={20} className="text-indigo-500" />}
            </div>
            <div className="flex-1">
              <p className="font-black text-sm leading-tight">{toast.title}</p>
              <p className="text-xs font-bold opacity-80 mt-1">{toast.message}</p>
            </div>
          </div>
        ))}
      </div>
      
      <header className="px-8 pt-8 pb-4 flex items-center justify-between sticky top-0 bg-slate-50/90 backdrop-blur-xl z-50">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
          <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-xl shadow-indigo-100">
            <Heart size={22} fill="currentColor" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tighter">{t.appName}</h1>
        </div>
        <button onClick={() => setActiveTab('shop')} className="relative p-3 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-indigo-100 transition-all">
          <ShoppingBag size={24} className="text-slate-700" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white" />
        </button>
      </header>

      <main className="flex-1 px-8 pt-4 pb-24 overflow-y-auto scroll-smooth">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'friends' && renderFriends()}
        {activeTab === 'shop' && renderShop()}
        {activeTab === 'settings' && renderSettings()}
      </main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md glass px-10 py-5 flex justify-between items-center z-50 safe-area-inset-bottom rounded-t-[3rem] shadow-[0_-20px_50px_rgba(0,0,0,0.05)] border-t border-white">
        {[
          { id: 'dashboard', icon: Heart, label: t.dashboard },
          { id: 'friends', icon: Users, label: t.friends },
          { id: 'shop', icon: ShoppingBag, label: t.shop },
          { id: 'settings', icon: Settings, label: t.settings }
        ].map(item => (
          <button 
            key={item.id} 
            onClick={() => setActiveTab(item.id as any)} 
            className={`flex flex-col items-center space-y-1.5 transition-all duration-300 ${activeTab === item.id ? 'text-indigo-600 scale-110' : 'text-slate-300 hover:text-slate-500'}`}
          >
            <item.icon size={26} fill={activeTab === item.id ? 'currentColor' : 'none'} strokeWidth={activeTab === item.id ? 3 : 2} className={activeTab === item.id ? 'drop-shadow-md' : ''} />
            <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>

      {isEditProfileOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[110] flex items-end justify-center">
          <div className="bg-white w-full max-w-md rounded-t-[3.5rem] p-12 space-y-8 animate-in slide-in-from-bottom-full duration-700 shadow-2xl">
             <div className="flex justify-between items-center">
               <h3 className="text-3xl font-black text-slate-900 tracking-tight">{t.editProfile}</h3>
               <button onClick={() => setIsEditProfileOpen(false)} className="bg-slate-100 p-4 rounded-full hover:bg-slate-200 transition-colors"><X size={24} /></button>
             </div>
             <div className="space-y-4">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 ml-2">Display Name</p>
                <input 
                  value={editName} 
                  onChange={e => setEditName(e.target.value)}
                  placeholder="Enter name..."
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] px-8 py-5 font-black text-2xl outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
                />
             </div>
             <button 
               onClick={() => { setState(p => ({...p, name: editName})); setIsEditProfileOpen(false); pushNotification("Profile", "Updated!", "success"); }} 
               className="w-full bg-indigo-600 text-white py-6 rounded-[2.5rem] font-black text-xl shadow-2xl shadow-indigo-200 active:scale-95 transition-all"
             >
               {t.save}
             </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;