import React, { useState } from "react";
import { PaperPost } from "../types";
import { 
  Bookmark, 
  BookmarkCheck, 
  ExternalLink,
  Award,
  BookOpen
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface TimelinePostCardProps {
  paper: PaperPost;
  onInteraction: (id: string, action: "bookmark") => void;
}

export const TimelinePostCard: React.FC<TimelinePostCardProps> = ({
  paper,
  onInteraction
}) => {
  const [showAbstract, setShowAbstract] = useState(false);

  const authorText = paper.authors && paper.authors.length > 0
    ? paper.authors.slice(0, 3).join(", ") + (paper.authors.length > 3 ? " et al." : "")
    : "Independent Researchers";

  const mainAuthor = paper.authors && paper.authors.length > 0 ? paper.authors[0] : "Researcher";
  const displayHandle = mainAuthor.toLowerCase().replace(/[^a-z0-9]/g, "") || "anonymous";

  // Select field badges
  const fieldLabel = paper.fieldOfStudy || "General Science";

  return (
    <article id={`paper-card-${paper.id}`} className="p-4 bg-white hover:bg-[#F5F8FA] transition-all border-b border-[#E1E8ED]">
      <div className="flex gap-3">
        
        {/* Profile Circle with Initials */}
        <div className="w-10 h-10 rounded-full bg-[#E8F5FE] border border-[#EFF3F4] flex items-center justify-center text-[#1DA1F2] font-sans font-extrabold text-xs select-none shrink-0 uppercase">
          {mainAuthor.split(" ").map(n => n[0]).slice(0, 2).join("") || "R"}
        </div>

        {/* Post Content */}
        <div className="flex-1 min-w-0 space-y-2">
          
          {/* Header metadata row */}
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <span className="font-extrabold text-[#0F1419] text-sm hover:underline hover:text-[#1DA1F2] cursor-pointer block truncate md:inline leading-none mr-1.5 font-sans">
                {mainAuthor}
              </span>
              <span className="text-slate-400 text-xs font-mono truncate hidden sm:inline mr-1.5">
                @{displayHandle}
              </span>
              <span className="text-slate-300 text-xs hidden sm:inline mr-1.5">&bull;</span>
              <span className="text-slate-400 text-[11px] font-mono">
                {new Date(paper.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>

            {/* Field Badge */}
            <span className="bg-[#E8F5FE] border border-sky-100 text-[#1DA1F2] font-mono text-[9px] uppercase tracking-wide font-extrabold px-2 py-0.5 rounded-full select-none">
              {fieldLabel}
            </span>
          </div>

          {/* Paper Title */}
          <h3 className="text-sm font-bold text-[#0F1419] leading-snug tracking-tight font-sans hover:text-[#1DA1F2] transition-colors">
            {paper.title}
          </h3>

          {/* Paper Post Body (Using paper's punchy brief TLDR if available, otherwise truncated description) */}
          <div className="text-xs text-slate-700 font-sans leading-relaxed pr-2">
            "{paper.tldr || paper.abstract?.slice(0, 160) + "..."}"
          </div>

          {/* Authors registry handle */}
          <p className="text-[11px] text-[#1DA1F2] font-mono font-bold leading-none">
            Registry: <span className="opacity-80">{authorText}</span>
          </p>

          {/* Abstract Accordion button */}
          {paper.abstract && (
            <div className="pt-1.5 border-t border-[#E1E8ED]">
              <button
                onClick={() => setShowAbstract(!showAbstract)}
                className="text-[10.5px] font-mono font-bold text-slate-500 hover:text-[#1DA1F2] flex items-center gap-1 cursor-pointer select-none border border-[#E1E8ED] hover:bg-[#E8F5FE] px-2.5 py-1 rounded"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>{showAbstract ? "Collapse abstract detail" : "Read full study abstract"}</span>
              </button>

              <AnimatePresence>
                {showAbstract && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mt-2 p-3 bg-[#F5F8FA] border border-[#E1E8ED] rounded-lg"
                  >
                    <p className="text-xs text-[#2A2A2A] font-sans leading-relaxed">
                      {paper.abstract}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Editorial / Twitter Actions Panel */}
          <div className="flex items-center justify-between text-[#1DA1F2] pt-2 max-w-lg border-t border-[#E1E8ED] select-none font-sans">
            
            {/* Citations Count (Equivalent to Retweet) */}
            <div className="flex items-center gap-1.5 text-slate-500 hover:text-emerald-500 transition-colors cursor-pointer">
              <Award className="w-4 h-4 text-slate-400 hover:text-emerald-500" />
              <span className="text-[11px] font-mono font-bold hover:text-emerald-500">{paper.citationCount.toLocaleString()} citations</span>
            </div>

            {/* Bookmark button */}
            <button
              id={`btn-bookmark-${paper.id}`}
              onClick={() => onInteraction(paper.id, "bookmark")}
              className={`flex items-center gap-1 cursor-pointer select-none hover:bg-[#E8F5FE] transition-all px-2 py-1 rounded ${
                paper.isBookmarked ? "text-[#1DA1F2] font-extrabold" : "text-slate-400 font-bold"
              }`}
            >
              {paper.isBookmarked ? (
                <>
                  <BookmarkCheck className="w-4 h-4 text-[#1DA1F2] fill-[#1DA1F2] scale-110 animate-bounce" />
                  <span className="text-[11px] font-mono hidden sm:inline text-[#1DA1F2]">Bookmarked</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-4 h-4 text-slate-400" />
                  <span className="text-[11px] font-mono hidden sm:inline text-slate-405">Bookmark</span>
                </>
              )}
            </button>

            {/* Semantic Scholar External CDN link */}
            {paper.url && (
              <a
                href={paper.url}
                target="_blank"
                referrerPolicy="no-referrer"
                rel="noreferrer"
                className="text-slate-400 hover:text-[#1DA1F2] transition-colors p-1 rounded hover:bg-[#E8F5FE]"
                title="Open CDN record on Semantic Scholar graph portal"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-401 hover:text-[#1DA1F2]" />
              </a>
            )}
          </div>

        </div>
      </div>
    </article>
  );
};
