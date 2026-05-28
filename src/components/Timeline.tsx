import React, { useEffect, useRef, useState } from "react";
import { PaperPost } from "../types";
import { localDb } from "../db/indexedDB";
import { TimelinePostCard } from "./TimelinePostCard";
import { 
  Database, 
  RefreshCw, 
  Layers, 
  AlertCircle, 
  ChevronUp, 
  Search, 
  SlidersHorizontal, 
  Home as HomeIcon,
  Bookmark as BookmarkIcon,
  Bell as BellIcon,
  User as UserIcon,
  Flame,
  Sparkles,
  Trash2,
  Check,
  Send
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

// Intersection Observer lazy wrapper for simple viewport node virtualization
interface VirtualItemProps {
  children: React.ReactElement;
  id: string;
}

const VirtualItem: React.FC<VirtualItemProps> = ({ children, id }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [height, setHeight] = useState<number | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        setIsVisible(entry.isIntersecting);
        if (entry.isIntersecting) {
          setHeight(entry.target.getBoundingClientRect().height);
        }
      },
      {
        rootMargin: "500px 0px 500px 0px", // Pre-render when within 500px of viewport top/bottom
        threshold: 0.01,
      }
    );

    observer.observe(element);
    return () => {
      observer.unobserve(element);
    };
  }, []);

  return (
    <div ref={elementRef} id={`virtual-wrapper-${id}`}>
      {isVisible ? (
        children
      ) : (
        <div style={{ height: height ? `${height}px` : "200px" }} className="bg-slate-50/10 dark:bg-zinc-800/10 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-center text-xs text-gray-305 dark:text-zinc-600 font-mono">
          [Virtualized: Scientific Node {id.slice(0, 6)}]
        </div>
      )}
    </div>
  );
};

export const Timeline: React.FC = () => {
  // Timeline Active State (RAM Array)
  const [activeFeed, setActiveFeed] = useState<PaperPost[]>([]);
  const [activeField, setActiveField] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  
  // DB & State Stats
  const [cachedCount, setCachedCount] = useState(0);
  const [shownCount, setShownCount] = useState(0);
  
  // Navigation & Interactive states
  const [syncTopic, setSyncTopic] = useState("artificial intelligence");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ status: "idle" | "success" | "error"; message: string }>({ status: "idle", message: "" });
  const [newerAvailable, setNewerAvailable] = useState<PaperPost[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // High fidelity Twitter-style interactive states
  const [timelineTab, setTimelineTab] = useState<"for_you" | "bookmarks">("for_you");
  const [followingState, setFollowingState] = useState<{ [key: string]: boolean }>({
    "sarah": false,
    "david": false,
    "tri_dao": false,
    "jennifer": false
  });

  // Scroll adjustment & Observers elements
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const topAnchorRef = useRef<HTMLDivElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);
  const isPrependingRef = useRef(false);

  // Quick statistics
  const [totalCit, setTotalCit] = useState(0);

  // 1. BOOTSTRAP STAGE
  useEffect(() => {
    bootstrapApplication();
  }, []);

  const bootstrapApplication = async () => {
    try {
      // Step A: Load initial count in IndexedDB
      let localCount = await localDb.getCachedCount();
      
      // Step B: If local cache is totally empty or extremely low, pull 100 posts from backend database
      if (localCount < 5) {
        setSyncFeedback({ status: "idle", message: "Priming local science database..." });
        const resp = await fetch("/api/papers?limit=100");
        if (resp.ok) {
          const data = await resp.json();
          await localDb.cachePapers(data.papers || []);
          localCount = await localDb.getCachedCount();
        }
      }

      setCachedCount(localCount);
      
      // Step C: Hydrate active state with first 20 items from IndexedDB
      const initialSlices = await localDb.getCachedPapersOrdered(20, 0);
      setActiveFeed(initialSlices);
      setShownCount(initialSlices.length);

      // Recalculate citation counters
      const totalPaperMetrics = await localDb.getCachedPapersOrdered(500, 0);
      const totalCitations = totalPaperMetrics.reduce((acc, p) => acc + (p.citationCount || 0), 0);
      setTotalCit(totalCitations);
      
    } catch (err) {
      console.error("Bootstrapping SciFeed error:", err);
      setSyncFeedback({ status: "error", message: "Failed caching core assets locally." });
    }
  };

  // 2. REPLENISH CRITERIA CONTROLLER (Silent Background fetch when unread local items drop < 30)
  useEffect(() => {
    const replenishCheck = async () => {
      const remainingUnread = cachedCount - shownCount;
      if (remainingUnread < 30 && remainingUnread >= 0 && cachedCount > 0 && !isLoadingMore) {
        console.log(`[Silent Cacher] Local unread items (${remainingUnread}) dropped below 30 threshold. Triggering background sync...`);
        try {
          // Fetch the next 100 items from the server database silently
          const resp = await fetch(`/api/papers?offset=${cachedCount}&limit=100`);
          if (resp.ok) {
            const data = await resp.json();
            if (data.papers && data.papers.length > 0) {
              await localDb.cachePapers(data.papers);
              const refreshedCount = await localDb.getCachedCount();
              setCachedCount(refreshedCount);
              console.log(`[Silent Cacher] Sourced ${data.papers.length} newer items and stored to IndexedDB cache successfully.`);
            }
          }
        } catch (err) {
          console.warn("[Silent Cacher] Could not reach background synchronization host.", err);
        }
      }
    };
    replenishCheck();
  }, [shownCount, cachedCount]);

  // 3. PERSISTENT FEEDBACK APPLIER (Handles clicks on tweet posts)
  const handlePaperInteraction = async (id: string, _action: "bookmark") => {
    try {
      const paper = activeFeed.find((p) => p.id === id);
      if (!paper) return;

      const newBookmarkValue = !paper.isBookmarked;

      // Update client UI
      setActiveFeed((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isBookmarked: newBookmarkValue } : p))
      );

      // Update IndexedDB
      await localDb.updateBookmark(id, newBookmarkValue);
    } catch (err) {
      console.error("Failed recording interaction sync", err);
    }
  };

  // 4. DOWNWARD INFINITE SCROLL (Standard scroll pulling next slice of 10 from IndexedDB)
  useEffect(() => {
    const observer = new IntersectionObserver(
      async (entries) => {
        const [bottomEntry] = entries;
        if (
          bottomEntry.isIntersecting && 
          shownCount < cachedCount && 
          !isLoadingMore && 
          !searchQuery &&
          activeField === "All" &&
          timelineTab === "for_you"
        ) {
          setIsLoadingMore(true);
          // Wait momentarily for satisfying transition simulation
          setTimeout(async () => {
            try {
              const nextSliceIndex = shownCount;
              const nextSlice = await localDb.getCachedPapersOrdered(10, nextSliceIndex);
              
              if (nextSlice.length > 0) {
                setActiveFeed((prev) => {
                  const combined = [...prev, ...nextSlice];
                  const seen = new Set();
                  return combined.filter((item) => {
                    const isDup = seen.has(item.id);
                    seen.add(item.id);
                    return !isDup;
                  });
                });
                setShownCount((prev) => prev + nextSlice.length);
              }
            } catch (err) {
              console.error("Pagination load error", err);
            } finally {
              setIsLoadingMore(false);
            }
          }, 300);
        }
      },
      { root: scrollContainerRef.current, threshold: 0.1, rootMargin: "100px" }
    );

    const bottomAnchor = bottomAnchorRef.current;
    if (bottomAnchor) {
      observer.observe(bottomAnchor);
    }

    return () => {
      if (bottomAnchor) {
        observer.unobserve(bottomAnchor);
      }
    };
  }, [shownCount, cachedCount, isLoadingMore, searchQuery, activeField, timelineTab]);

  // 5. REVERSE INFINITE SCROLL UPWARDS OBSERVING ACCIDENT MITIGATION
  // Place search results or category alterations inside a separate handler
  useEffect(() => {
    const handleFiltersChange = async () => {
      // Pull and query filtered items directly from IndexedDB memory
      const allLocal = await localDb.getCachedPapersOrdered(1000, 0);
      let matching = [...allLocal];

      if (activeField !== "All") {
        matching = matching.filter((p) => p.fieldOfStudy === activeField);
      }
      
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase().trim();
        matching = matching.filter(
          (p) =>
            p.title.toLowerCase().includes(query) ||
            p.abstract.toLowerCase().includes(query) ||
            p.authors.some((author) => author.toLowerCase().includes(query))
        );
      }

      if (timelineTab === "bookmarks") {
        matching = matching.filter((p) => p.isBookmarked);
      }

      // Ensure filtered/matching list has unique items
      const seen = new Set();
      const uniqueMatching = matching.filter((item) => {
        const isDup = seen.has(item.id);
        seen.add(item.id);
        return !isDup;
      });

      setActiveFeed(uniqueMatching.slice(0, 40));
      setShownCount(uniqueMatching.length);
    };
    handleFiltersChange();
  }, [activeField, searchQuery, timelineTab]);

  // 6. DETECT NEW SHY SYNC RECORDS & OBSERVE TOP ANCHOR FOR PREPEND
  // Watch top anchor: When user hits top, if 'newerAvailable' array holds items, prepend them smoothly.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [topEntry] = entries;
        if (topEntry.isIntersecting && newerAvailable.length > 0) {
          executePrependFeed();
        }
      },
      { root: scrollContainerRef.current, threshold: 0.8 }
    );

    const anchor = topAnchorRef.current;
    if (anchor) {
      observer.observe(anchor);
    }
    return () => {
      if (anchor) {
        observer.unobserve(anchor);
      }
    };
  }, [newerAvailable]);

  // Smart Prepend Routine (Layout Shift Prevention)
  const executePrependFeed = () => {
    if (newerAvailable.length === 0) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    // A: Record structural dimensions before prepends
    const previousScrollHeight = container.scrollHeight;
    const previousScrollTop = container.scrollTop;

    isPrependingRef.current = true;

    // B: Integrate newly arrived files inside layout with de-duplication
    setActiveFeed((prev) => {
      const combined = [...newerAvailable, ...prev];
      const seen = new Set();
      return combined.filter((item) => {
        const isDup = seen.has(item.id);
        seen.add(item.id);
        return !isDup;
      });
    });
    setShownCount((prev) => prev + newerAvailable.length);
    setNewerAvailable([]);

    // C: Readjust scrolling relative values smoothly in standard frame
    requestAnimationFrame(() => {
      const newScrollHeight = container.scrollHeight;
      const heightDifference = newScrollHeight - previousScrollHeight;
      container.scrollTop = previousScrollTop + heightDifference;
      isPrependingRef.current = false;
    });
  };

  // 7. EXTERNAL SYNC JOB (Triggered via click)
  const triggerScienceScholarSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSyncing) return;

    setIsSyncing(true);
    setSyncFeedback({ status: "idle", message: `Connecting to Academic Graph API for "${syncTopic}"...` });

    try {
      const resp = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: syncTopic })
      });

      if (!resp.ok) throw new Error("Synchronization pipeline offline.");

      const result = await resp.json();

      if (result.success && result.papersSynced > 0) {
        // Sync newly fetched items from backend
        const serverRecent = await fetch("/api/papers?limit=100");
        if (serverRecent.ok) {
          const freshData = await serverRecent.json();
          // Write directly to IndexedDB
          await localDb.cachePapers(freshData.papers || []);
          const finalCount = await localDb.getCachedCount();
          setCachedCount(finalCount);

          // Work out if they are newer relative to active timeline max date
          const activeMaxTime = activeFeed.length > 0 ? new Date(activeFeed[0].createdAt).getTime() : 0;
          const freshFromIndex = await localDb.getCachedPapersOrdered(40, 0);
          
          const trulyNewItems = freshFromIndex.filter(p => new Date(p.createdAt).getTime() > activeMaxTime);

          if (trulyNewItems.length > 0) {
            // Store inside prepend buffer!
            setNewerAvailable(prev => {
              const combined = [...trulyNewItems, ...prev];
              // De-duplicate
              const seen = new Set();
              return combined.filter(item => {
                const duplicate = seen.has(item.id);
                seen.add(item.id);
                return !duplicate;
              });
            });
            setSyncFeedback({
              status: "success",
              message: result.error 
                ? `${result.error} Ready to inject into timeline.` 
                : `Sync success! ${trulyNewItems.length} brand new posts verified. Scroll up metadata to inject into timeline.`
            });
          } else {
            setSyncFeedback({
              status: "success",
              message: result.error 
                ? result.error 
                : `Sync success! Sourced and verified matching records.`
            });
          }
        }
      } else {
        setSyncFeedback({
          status: "success",
          message: result.error ? `Server sync returned: ${result.error}` : "Academic indices completely up to date. No newer items found."
        });
      }
    } catch (err: any) {
      console.error(err);
      setSyncFeedback({ status: "error", message: err.message || "Failed reaching Semantic Scholar cloud node." });
    } finally {
      setIsSyncing(false);
      // Auto-clear success or neutral notices after 5 seconds to reduce clutter
      setTimeout(() => {
        setSyncFeedback(prev => prev.status === "error" ? prev : { status: "idle", message: "" });
      }, 5000);
    }
  };

  const clearCachedCollection = async () => {
    if (confirm("Reset local IndexedDB cache? Default standard science seed papers will be restored on refresh.")) {
      await localDb.clearAll();
      bootstrapApplication();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-2 md:px-4 grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 min-h-[calc(100vh-74px)] bg-[#E6ECF0] text-[#0F1419]">
      
      {/* ================= COLUMN 1: LEFT VERTICAL NAVIGATION (lg:col-span-3) ================= */}
      <aside className="lg:col-span-3 flex flex-col justify-between py-2 border-r border-[#E1E8ED]/70 pr-2 lg:pr-4 h-[calc(100vh-80px)] sticky top-[74px] hidden lg:flex select-none font-sans">
        <div className="space-y-6">
          
          {/* Twitter Sidebar Navigation Links */}
          <nav className="space-y-1">
            <button
              onClick={() => { setTimelineTab("for_you"); setActiveField("All"); }}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-full text-base font-bold transition-all hover:bg-[#E8F5FE] hover:text-[#1DA1F2] ${
                timelineTab === "for_you" && activeField === "All" ? "text-[#1DA1F2]" : "text-slate-700"
              }`}
            >
              <HomeIcon className="w-5 h-5 stroke-[2.5]" />
              <span>Timeline Home</span>
            </button>
            
            <button
              onClick={() => setTimelineTab("bookmarks")}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-full text-base font-bold transition-all hover:bg-[#E8F5FE] hover:text-[#1DA1F2] ${
                timelineTab === "bookmarks" ? "text-[#1DA1F2]" : "text-slate-700"
              }`}
            >
              <BookmarkIcon className="w-5 h-5 stroke-[2.5]" />
              <span>My Bookmarks</span>
            </button>

            <div className="px-4 py-3 flex items-center gap-4 rounded-full text-slate-400 font-bold cursor-not-allowed">
              <BellIcon className="w-5 h-5" />
              <span>Peer Alerts</span>
            </div>

            <div className="px-4 py-3 flex items-center gap-4 rounded-full text-slate-400 font-bold cursor-not-allowed">
              <UserIcon className="w-5 h-5" />
              <span>Researcher Profile</span>
            </div>
          </nav>

          {/* Quick Active Science Sub-topics Selectors */}
          <div className="space-y-2">
            <h4 className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-[#1DA1F2] px-4">Topics Registry</h4>
            <div className="space-y-1">
              {[
                { label: "All Sciences", value: "All" },
                { label: "Computer Science", value: "Computer Science" },
                { label: "Astrophysics & Waves", value: "Physics" },
                { label: "Biomedical / CRISPR", value: "Biology" },
                { label: "Climate & Geology", value: "Chemistry" }
              ].map((topic) => (
                <button
                  key={topic.value}
                  onClick={() => {
                    setActiveField(topic.value);
                    setTimelineTab("for_you");
                  }}
                  className={`w-full text-left px-4 py-2 text-xs rounded-lg transition-all flex items-center justify-between font-mono font-bold tracking-tight ${
                    activeField === topic.value && timelineTab !== "bookmarks"
                      ? "bg-[#1DA1F2] text-white"
                      : "text-slate-600 hover:bg-[#E8F5FE] border border-transparent hover:border-[#E1E8ED]/50"
                  }`}
                >
                  <span>{topic.label}</span>
                  {activeField === topic.value && timelineTab !== "bookmarks" && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>
 
          {/* Quick External Sync Action form in Left Sidebar */}
          <div className="p-3 bg-white border border-[#E1E8ED] rounded-xl space-y-3">
            <div className="flex items-center gap-2">
              <RefreshCw className={`w-3.5 h-3.5 text-[#1DA1F2] ${isSyncing ? "animate-spin" : ""}`} />
              <span className="text-[11px] font-mono font-extrabold uppercase text-slate-700">Rapid Sync API</span>
            </div>
            
            <select
              value={syncTopic}
              onChange={(e) => setSyncTopic(e.target.value)}
              className="w-full bg-white border border-[#E1E8ED] rounded px-2.5 py-1.5 text-[10.5px] font-mono font-bold text-slate-800 focus:outline-none focus:border-[#1DA1F2] select-none"
            >
              <option value="artificial intelligence">AI & Deep Learning</option>
              <option value="quantum computing">Quantum Computing</option>
              <option value="crispr gene editing">CRISPR Editing</option>
              <option value="gravitational wave physics">Gravitational Waves</option>
              <option value="climate change dynamics">Climate Dynamics</option>
              <option value="superconductivity">Superconductors</option>
            </select>
 
            <button
              onClick={triggerScienceScholarSync}
              disabled={isSyncing}
              className="w-full bg-[#1DA1F2] hover:bg-[#1A91DA] disabled:bg-[#E1E8ED] text-white font-mono text-[10px] uppercase font-bold tracking-wider py-2 rounded transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              {isSyncing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Database className="w-3 h-3" />}
              <span>Sync Semantic Scholar</span>
            </button>
          </div>
        </div>
 
        {/* Profile Card / Identity element at bottom */}
        <div className="flex items-center gap-3 p-2 bg-white rounded-full border border-[#E1E8ED]/40">
          <div className="w-9 h-9 rounded-full bg-[#E8F5FE] flex items-center justify-center text-[#1DA1F2] font-bold font-mono text-sm border border-sky-100 uppercase">
            Dr
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-[#0F1419] truncate">Dr. Investigator</p>
            <p className="text-[10px] text-slate-400 font-mono truncate">@peer_reviewer</p>
          </div>
          <Sparkles className="w-4 h-4 text-[#1DA1F2] fill-[#1DA1F2]/50 mr-2 shrink-0 animate-pulse" />
        </div>
      </aside>
 
      {/* ================= COLUMN 2: CENTER TIMELINE MICRO-FEED (lg:col-span-6) ================= */}
      <main className="lg:col-span-6 flex flex-col border-r border-l border-[#E1E8ED]/70 min-h-[calc(100vh-80px)] bg-white">
        
        {/* Custom Header Tabs on Top (Static/Non-floating) */}
        <div className="bg-white border-b border-[#E1E8ED] font-sans">
          <div className="px-4 py-3 flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight text-slate-900">Home Feed</h2>
            <div className="flex items-center gap-1 px-2.5 py-1 bg-[#E8F5FE] border border-sky-100 rounded-full text-[10px] font-mono font-bold text-[#1DA1F2]">
              <Sparkles className="w-3 h-3 text-[#1DA1F2] fill-[#1DA1F2] animate-pulse" />
              <span>{cachedCount} posts fetched</span>
            </div>
          </div>
          
          {/* Main Feed Toggle Tabs (Similar to Twitter's For You vs Following) */}
          <div className="flex border-b border-[#E1E8ED]/60 select-none">
            <button
              onClick={() => setTimelineTab("for_you")}
              className="flex-1 text-center py-3.5 text-xs font-bold uppercase tracking-wider relative transition-all hover:bg-[#E8F5FE] cursor-pointer"
            >
              <span className={timelineTab === "for_you" ? "text-[#1DA1F2] font-extrabold" : "text-slate-500"}>
                For You (Discover)
              </span>
              {timelineTab === "for_you" && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-[3px] bg-[#1DA1F2] rounded-full" />
              )}
            </button>
            <button
              onClick={() => setTimelineTab("bookmarks")}
              className="flex-1 text-center py-3.5 text-xs font-bold uppercase tracking-wider relative transition-all hover:bg-[#E8F5FE] cursor-pointer"
            >
              <span className={timelineTab === "bookmarks" ? "text-[#1DA1F2] font-extrabold" : "text-slate-500"}>
                My Bookmarks ({activeFeed.filter(p => p.isBookmarked).length})
              </span>
              {timelineTab === "bookmarks" && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-[3px] bg-[#1DA1F2] rounded-full" />
              )}
            </button>
          </div>
 
        </div>
 
        {/* Twitter Post Composer mockup on top of the feed - Allows users to scrape scientific topics! */}
        <div className="p-4 border-b border-[#E1E8ED] bg-white select-none font-sans">
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-full bg-[#1DA1F2] flex items-center justify-center text-white text-sm font-black shrink-0">
              K
            </div>
            <div className="flex-1 space-y-2">
              <label htmlFor="composer-topic" className="sr-only">Query topics to index</label>
              <div className="text-xs text-slate-500 font-mono flex items-center gap-1">
                <span>Search and index new papers about:</span>
                <span className="font-extrabold text-[#1DA1F2] uppercase">#{syncTopic.replace(/\s+/g, '')}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  id="composer-topic"
                  type="text"
                  placeholder="What's happening in sci-research? Type a topic (e.g. LLMs)..."
                  value={syncTopic}
                  onChange={(e) => setSyncTopic(e.target.value)}
                  className="w-full text-xs bg-white border border-[#E1E8ED] rounded-lg px-3 py-2 focus:outline-none focus:border-[#1DA1F2] text-slate-800"
                />
              </div>
 
              <div className="flex items-center justify-between pt-1 border-t border-[#E1E8ED]/50 font-sans">
                <div className="flex items-center gap-1.5 text-[#1DA1F2]">
                  <span className="text-[10px] font-mono font-bold bg-[#1DA1F2]/5 text-[#1DA1F2] px-2 py-0.5 rounded">Semantic Scholar Graph REST API</span>
                  {isSyncing && <RefreshCw className="w-3 h-3 animate-spin text-[#1DA1F2]" />}
                </div>
                
                <button
                  onClick={triggerScienceScholarSync}
                  disabled={isSyncing || !syncTopic.trim()}
                  className="bg-[#1DA1F2] hover:bg-[#1A91DA] disabled:bg-[#E1E8ED] text-white text-[11px] font-bold font-mono uppercase tracking-wider px-4 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3 h-3" />
                  <span>Discover & Index</span>
                </button>
              </div>
            </div>
          </div>
 
          {/* Inline feedback sync notification */}
          {syncFeedback.message && (
            <div className={`mt-3 p-2.5 rounded-lg text-xs flex gap-2 items-start font-mono border ${
              syncFeedback.status === "error" 
                ? "bg-rose-50 border-rose-200 text-rose-700"
                : "bg-white border-[#E1E8ED] text-slate-700"
            }`}>
              {syncFeedback.status === "success" ? (
                <Check className="w-4 h-4 text-[#1DA1F2] shrink-0 mt-0.5 stroke-[3]" />
              ) : syncFeedback.status === "error" ? (
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              ) : (
                <RefreshCw className="w-4 h-4 text-[#1DA1F2] animate-spin shrink-0 mt-0.5" />
              )}
              <span className="flex-1">{syncFeedback.message}</span>
            </div>
          )}
        </div>

        {/* TIMELINE VIEWPORT (Core Scroll Panel) */}
        <div
          id="knolly-timeline-viewport"
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto custom-scrollbar relative bg-white"
        >
          {/* Invisible Anchor for upward scroll detection */}
          <div ref={topAnchorRef} className="h-2 w-full absolute top-0" />

          {/* Prepend Header Notification Indicator bubble floating on feed */}
          <AnimatePresence>
            {newerAvailable.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 10 }}
                exit={{ opacity: 0, y: -25 }}
                className="absolute left-1/2 -translate-x-1/2 z-20"
              >
                <button
                  id="btn-prepend-feed"
                  onClick={executePrependFeed}
                  className="bg-[#1DA1F2] hover:bg-[#1A91DA] text-white font-mono uppercase tracking-widest text-[9px] font-extrabold py-2 px-3 shadow-md rounded-full flex items-center gap-1.5 animate-bounce transition-all cursor-pointer border border-white/15"
                >
                  <ChevronUp className="w-3 h-3 stroke-[3]" />
                  <span>{newerAvailable.length} Sci-Alerts prepended in cache</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {activeFeed.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center h-[260px]">
              <div className="w-12 h-12 rounded-full bg-[#E8F5FE] border border-[#EFF3F4] flex items-center justify-center text-[#1DA1F2] mb-3 select-none">
                <SlidersHorizontal className="w-5 h-5 animate-pulse" />
              </div>
              <p className="text-sm font-bold text-slate-800 font-sans">No research papers in this timeline segment</p>
              <p className="text-xs text-slate-400 max-w-sm mt-1.5 font-sans italic">
                {timelineTab === "bookmarks"
                  ? "You haven't added study items to your bookmarks tab yet. Tap the bookmark icon on any paper cards below."
                  : "Try clearing search queries, toggle study tags, or trigger an on-the-fly Academic indexing sync."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#E1E8ED]">
              {Array.from(new Map(activeFeed.map((paper) => [paper.id, paper])).values()).map((paper) => (
                <VirtualItem key={paper.id} id={paper.id}>
                  <TimelinePostCard
                    paper={paper}
                    onInteraction={handlePaperInteraction}
                  />
                </VirtualItem>
              ))}
            </div>
          )}

          {/* Bottom pull-older loader indicator */}
          <div ref={bottomAnchorRef} className="p-8 flex justify-center text-[10px] font-mono uppercase tracking-widest text-[#1DA1F2] font-bold select-none">
            {isLoadingMore ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Harvesting older papers from IndexedDB buffer...</span>
              </div>
            ) : shownCount >= cachedCount && activeFeed.length > 0 ? (
              <span className="text-slate-450 font-mono tracking-widest">--- End of Offline Feed ---</span>
            ) : (
              <span className="opacity-0">Scrolling Trigger Area</span>
            )}
          </div>
        </div>

      </main>

      {/* ================= COLUMN 3: RIGHT SIDEBAR & SEARCH PANEL (lg:col-span-3) ================= */}
      <aside className="lg:col-span-3 py-2 space-y-5 h-[calc(100vh-80px)] overflow-y-auto pr-1 hidden lg:block select-none custom-scrollbar font-sans">
        
        {/* Search widget box */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-4.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search literature database..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-xs bg-white hover:bg-[#E8F5FE]/30 focus:bg-white border border-[#E1E8ED] focus:border-[#1DA1F2] rounded-full pl-10 pr-4 py-3 w-full focus:outline-none transition-all font-sans text-[#0F1419]"
          />
        </div>

        {/* What's Happening "Trending in Science" Hashtags */}
        <div className="bg-white border border-[#E1E8ED] rounded-2xl p-4 space-y-3.5">
          <div className="flex items-center justify-between border-b border-[#E1E8ED] pb-2">
            <h3 className="font-bold text-[#0F1419] text-sm font-sans">What's Trending</h3>
            <Flame className="w-4 h-4 text-orange-500 fill-orange-500 animate-pulse" />
          </div>

          <div className="space-y-4">
            {[
              { tag: "ArtificialIntelligence", label: "Direct Alignment / DPO", posts: 420, topic: "artificial intelligence" },
              { tag: "QuantumComputing", label: "Surface Code Correction Gates", posts: 142, topic: "quantum computing" },
              { tag: "CRISPRGeneEditing", label: "Single-Nucleotide Transitions", posts: 940, topic: "crispr gene editing" },
              { tag: "GravitationalWaves", label: "Pulsar Timing Array Noise", posts: 112, topic: "gravitational wave physics" },
              { tag: "ClimateDynamics", label: "Basalt Carbon Mineralization", posts: 195, topic: "climate change dynamics" },
              { tag: "Superconductors", label: "Hydride Megabar Pressure", posts: 384, topic: "superconductivity" }
            ].map((trend) => (
              <button
                key={trend.tag}
                onClick={() => {
                  setSyncTopic(trend.topic);
                  setSearchQuery("");
                  setActiveField("All");
                  setTimelineTab("for_you");
                  // Trigger direct sync immediately if they click the trend, providing instantaneous scientific interaction!
                  setSyncFeedback({ status: "idle", message: `Direct trend sync triggered: ${trend.label}` });
                  const eMock = { preventDefault: () => {} } as any;
                  setTimeout(() => {
                    triggerScienceScholarSync(eMock);
                  }, 50);
                }}
                className="w-full text-left group block focus:outline-none"
              >
                <div className="flex items-center justify-between font-sans">
                  <span className="text-[10px] text-slate-500 font-mono">Trending in Science &bull; Active</span>
                  <Sparkles className="w-3 h-3 text-[#1DA1F2] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-xs font-bold text-[#0F1419] mt-0.5 group-hover:text-[#1DA1F2] group-hover:underline transition-all">
                  #{trend.tag}
                </p>
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono mt-0.5">
                  <span>{trend.label}</span>
                  <span className="bg-slate-100 px-1.5 py-0.2 rounded text-[9.5px]">{trend.posts} citations</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Who to Follow ("Recommended Reviewers List") */}
        <div className="bg-white border border-[#E1E8ED] rounded-2xl p-4 space-y-3.5">
          <div className="border-b border-[#E1E8ED] pb-2">
            <h3 className="font-bold text-[#0F1419] text-sm font-sans">Who to follow</h3>
          </div>

          <div className="space-y-3.5">
            {[
              { id: "sarah", name: "Dr. S. Demetridis", handle: "@nanograv_sarah", field: "Astrophysics Hub" },
              { id: "david", name: "David Liu", handle: "@baseeditor", field: "CRISPR Base Lab" },
              { id: "tri_dao", name: "Tri Dao", handle: "@flash_attention", field: "GPU Kernel Architect" },
              { id: "jennifer", name: "Jennifer Doudna", handle: "@crispr_cas9", field: "Nobel Genome Lab" }
            ].map((user) => (
              <div key={user.id} className="flex items-center justify-between gap-1.5 font-sans">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[#0F1419] truncate leading-tight">{user.name}</p>
                  <p className="text-[10px] text-slate-400 truncate leading-none mt-0.5">{user.handle}</p>
                  <p className="text-[10px] text-[#1DA1F2] font-mono leading-none mt-1 font-bold">{user.field}</p>
                </div>
                
                <button
                  onClick={() => setFollowingState(prev => ({ ...prev, [user.id]: !prev[user.id] }))}
                  className={`text-[10px] font-bold font-mono px-3 py-1 rounded-full transition-all cursor-pointer select-none ${
                    followingState[user.id]
                      ? "bg-slate-200 text-slate-705 hover:bg-slate-300"
                      : "bg-[#1DA1F2] text-white hover:bg-[#1A91DA]"
                  }`}
                >
                  {followingState[user.id] ? "Following" : "Follow"}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Diagnostic analytics card */}
        <div className="bg-white rounded-2xl border border-[#E1E8ED] p-4 space-y-3 select-none font-sans">
          <h4 className="font-extrabold text-[#1DA1F2] text-[10px] font-mono uppercase tracking-widest flex items-center justify-between">
            <span>Database RAM Diagnostics</span>
            <Layers className="w-3.5 h-3.5" />
          </h4>

          <div className="space-y-2 text-[11px] font-mono select-none">
            <div className="flex justify-between border-b border-[#E1E8ED]/50 pb-1.5">
              <span className="text-slate-500">IndexedDB cache:</span>
              <span className="font-bold text-[#1DA1F2]">{cachedCount} items</span>
            </div>
            <div className="flex justify-between border-b border-[#E1E8ED]/50 pb-1.5">
              <span className="text-slate-500">Hydrated view:</span>
              <span className="font-bold">{shownCount} posts</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Citations catalog:</span>
              <span className="font-thin text-sky-800">{totalCit.toLocaleString()}</span>
            </div>
          </div>

          <div className="pt-2.5 border-t border-[#E1E8ED] flex justify-between items-center">
            <button
              onClick={clearCachedCollection}
              className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#1DA1F2] hover:underline flex items-center gap-1.5 transition-all text-left animate-pulse"
            >
              <Trash2 className="w-3 h-3 text-[#1DA1F2]" />
              <span>Flush local IndexedDB</span>
            </button>
            <span className="text-[9px] text-slate-300 font-mono">v1.2.4</span>
          </div>
        </div>

      </aside>
      
    </div>
  );
};
