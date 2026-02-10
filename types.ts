
export enum Language {
  EN = 'en',
  UA = 'ua'
}

export enum UserStatus {
  SAFE = 'safe',
  WARNING = 'warning',
  ALERT = 'alert'
}

export interface MessengerLinks {
  phone?: string;
  facebook?: string;
  telegram?: string;
  whatsapp?: string;
  viber?: string;
}

export interface Friend {
  id: string;
  name: string;
  avatar: string;
  lastCheckIn: number; // timestamp
  status: UserStatus;
  points: number;
  mood?: string;
  messengers?: MessengerLinks;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
}

export interface FriendRequest {
  id: string;
  name: string;
  avatar: string;
  timestamp: number;
}

export interface Toast {
  id: string;
  type: 'info' | 'error' | 'success';
  title: string;
  message: string;
}

export interface UserState {
  id: string;
  name: string;
  points: number;
  streak: number;
  highestStreak: number;
  lastCheckIn: number;
  language: Language;
  friends: Friend[];
  messages: Record<string, Message[]>; // friendId -> messages
  pendingRequests: FriendRequest[];
  notificationsEnabled: boolean;
  isLoggedIn: boolean;
  authProvider?: 'google' | 'apple' | 'facebook';
  mood?: string;
  messengers: MessengerLinks;
  // VIP System
  isVip: boolean;
  coins: number;
  level: number;
  xp: number;
}

export type AppTranslations = {
  [key in Language]: {
    appName: string;
    checkInButton: string;
    checkedIn: string;
    points: string;
    streak: string;
    friends: string;
    chat: string;
    settings: string;
    language: string;
    emergencyAlert: string;
    lastSeen: string;
    hoursAgo: string;
    now: string;
    aiSuggestion: string;
    encouragement: string;
    friendStatusSafe: string;
    friendStatusWarning: string;
    friendStatusAlert: string;
    addFriend: string;
    dashboard: string;
    friendRequests: string;
    accept: string;
    decline: string;
    noRequests: string;
    simulateRequest: string;
    notifications: string;
    testEmergency: string;
    newFriendRequest: string;
    emergencyWarning: string;
    welcomeMessage: string;
    loginGoogle: string;
    loginFacebook: string;
    loginApple: string;
    signOut: string;
    authTagline: string;
    setMood: string;
    call: string;
    chooseCallMethod: string;
    linkedMessengers: string;
    phone: string;
    facebook: string;
    telegram: string;
    whatsapp: string;
    viber: string;
    save: string;
    editProfile: string;
    // New VIP strings
    vipMember: string;
    level: string;
    coins: string;
    levelUp: string;
    becomeVip: string;
    vipBenefits: string;
  }
};
