export type Tier = 1 | 2 | 3;

export interface ComposerEntry {
  id: string;           // kebab-case: "debussy", "rimsky-korsakov"
  nameJa: string;       // 日本語名: "ドビュッシー"
  nameOriginal: string; // 原語名: "Claude Debussy"
  tier: Tier;
  skeleton: "none" | "draft" | "reviewed";
  articulation: "none" | "done";
  gaps: number;         // 未解消ギャップ数
  lastUpdated: string;  // ISO date
}

export interface ComposerData {
  composers: ComposerEntry[];
}

export interface SkeletonSection {
  basicInfo: {
    birthDeath: string;
    birthPlace: string;
    activeCities: string[];
  };
  historicalPosition: {
    era: string;
    style: string;
    influences: { from: string[]; to: string[] };
  };
  timeline: TimelineEntry[];
  masterworks: Masterwork[];
  episodes: string[];
  sources: SourceEntry[];
}

export interface TimelineEntry {
  year: number;
  age: number | null;
  event: string;
  period: string;       // 初期/中期/後期 etc.
  relatedWorks: string;
}

export interface Masterwork {
  rank: number;
  title: string;
  genre: string;
  year: number | string;
  listened: boolean;
  notes: string;
}

export interface SourceEntry {
  category: string;     // "Grove", "学術書", "IMSLP", "Wikipedia (en)", etc.
  detail: string;
  reliabilityRank: 1 | 2 | 3 | 4;
}
