export interface Comment {
  id: string;
  user: string;
  text: string;
  date: string;
}

export interface PaperPost {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  tldr?: string;
  createdAt: string;
  citationCount: number;
  isBookmarked: boolean;
  comments: Comment[];
  fieldOfStudy?: string;
  influenceCount?: number;
  paperId?: string;
  url?: string;
}

export type TimelineTab = "for_you" | "bookmarks";

export interface SyncFeedback {
  status: "idle" | "syncing" | "success" | "error";
  message: string;
}
