import Dexie, { type Table } from "dexie";
import { PaperPost, Comment } from "../types";

class KnollyDatabase extends Dexie {
  papers!: Table<PaperPost, string>;

  constructor() {
    super("KnollyDatabase");
    this.version(1).stores({
      papers: "id, createdAt, title, isBookmarked, fieldOfStudy"
    });
  }

  async getCachedCount(): Promise<number> {
    return this.papers.count();
  }

  async getCachedPapersOrdered(limit: number, offset: number): Promise<PaperPost[]> {
    return this.papers
      .orderBy("createdAt")
      .reverse()
      .offset(offset)
      .limit(limit)
      .toArray();
  }

  async cachePapers(freshPapers: PaperPost[]): Promise<void> {
    await this.transaction("rw", this.papers, async () => {
      for (const p of freshPapers) {
        const existing = await this.papers.get(p.id);
        if (existing) {
          // Merge newly pulled paper data of Semantic Scholar without overriding bookmarks and comments
          await this.papers.update(p.id, {
            title: p.title,
            authors: p.authors && p.authors.length > 0 ? p.authors : existing.authors,
            abstract: p.abstract || existing.abstract,
            tldr: p.tldr || existing.tldr,
            citationCount: Math.max(p.citationCount || 0, existing.citationCount || 0),
            fieldOfStudy: p.fieldOfStudy || existing.fieldOfStudy,
            influenceCount: p.influenceCount || existing.influenceCount,
            url: p.url || existing.url
          });
        } else {
          await this.papers.put({
            ...p,
            isBookmarked: p.isBookmarked ?? false,
            comments: p.comments ?? [],
            createdAt: p.createdAt || new Date().toISOString()
          });
        }
      }
    });
  }

  async clearAll(): Promise<void> {
    await this.papers.clear();
  }

  async updateBookmark(id: string, isBookmarked: boolean): Promise<void> {
    await this.papers.update(id, { isBookmarked });
  }

  async addComment(id: string, comment: Comment): Promise<void> {
    const existing = await this.papers.get(id);
    if (existing) {
      const updatedComments = [...(existing.comments || []), comment];
      await this.papers.update(id, { comments: updatedComments });
    }
  }

  async getPaperById(id: string): Promise<PaperPost | undefined> {
    return this.papers.get(id);
  }
}

export const localDb = new KnollyDatabase();
export default KnollyDatabase;
