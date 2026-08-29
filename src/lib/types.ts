export type Profile = {
  userId: string;
  displayName: string;
  avatarHue: number;
  bio: string;
  coins: number;
  charm: number;
  level: number;
  xp: number;
  lang: "bn" | "en";
  phone: string | null;
  followers: number;
  following: number;
  lastDailyAt: string | null;
};

export type RoomSummary = {
  id: string;
  title: string;
  topic: string;
  hostId: string | null;
  people: number;
  speakers: number;
  isLive: boolean;
};

export type RoomMember = {
  userId: string;
  displayName: string;
  avatarHue: number;
  role: "host" | "speaker" | "listener";
  seat: number | null;
  muted: boolean;
};

export type RoomDetail = {
  id: string;
  title: string;
  topic: string;
  hostId: string | null;
  isLive: boolean;
  members: RoomMember[];
};

export type ChatMessage = {
  id: string;
  userId: string;
  displayName: string;
  body: string;
  kind: "chat" | "gift";
  giftId: string | null;
  emoji?: string;
  toUser?: string;
  toName?: string;
  createdAt: string;
};

export type GiftHistoryRow = {
  id: string;
  giftId: string;
  cost: number;
  from: string;
  to: string;
  createdAt: string;
  emoji: string;
  nameEn: string;
  nameBn: string;
};
