import { Timeline } from "./components/Timeline";
import { BookOpen, HelpCircle } from "lucide-react";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

export default function App() {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="min-h-screen bg-[#E6ECF0] text-[#0F1419] flex flex-col font-sans transition-colors selection:bg-[#1DA1F2]/25 selection:text-[#0F1419]">
      
      {/* Mobile Top Header (hidden on desktop to mimic pure Twitter column layouts) */}
      <header className="lg:hidden bg-white/95 backdrop-blur-md sticky top-0 z-30 border-b border-[#E1E8ED] px-4 py-3.5 flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#1DA1F2] flex items-center justify-center text-white font-sans font-black text-base select-none">
            K
          </div>
          <span className="font-sans font-black text-lg text-[#1DA1F2] tracking-tight">Knolly</span>
        </div>

        <button
          onClick={() => setShowInfo(!showInfo)}
          className="text-slate-500 hover:text-[#1DA1F2] hover:bg-[#E8F5FE] border border-[#E1E8ED] px-3.5 py-1 rounded-full text-[10.5px] font-sans font-bold uppercase tracking-wider transition-all"
        >
          Protocol Spec
        </button>
      </header>

      {/* Desktop Quick Header Float (sticky only on top right margin layer) */}
      <div className="hidden lg:block absolute right-6 top-4 z-40 select-none">
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="text-slate-500 hover:text-[#1DA1F2] hover:bg-[#E8F5FE] border border-[#E1E8ED] hover:border-[#1DA1F2] px-3.5 py-1.5 rounded-full transition-all flex items-center gap-2 text-xs font-sans font-bold uppercase tracking-wider"
          title="Read application methodology specifications"
        >
          <HelpCircle className="w-3.5 h-3.5 text-[#1DA1F2]" />
          <span>Protocol Specification</span>
        </button>
      </div>

      {/* Specification Protocol Modal Dropdown banner */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-[#F5F8FA] border-b border-[#E1E8ED] overflow-hidden"
          >
            <div className="max-w-4xl mx-auto px-6 py-6 text-xs md:text-sm text-slate-700 leading-relaxed grid grid-cols-1 md:grid-cols-2 gap-8 select-none">
              <div>
                <h3 className="font-bold text-[#1DA1F2] text-xs uppercase tracking-widest mb-2.5 flex items-center gap-1.5 font-sans">
                  <BookOpen className="w-4 h-4" /> Academic Graph Synchronizer
                </h3>
                <p className="font-sans italic text-[14px]">
                  Knolly connects directly to the Semantic Scholar REST API, downloading index records within a strict <strong>10-year publication limit</strong> (2016 onward). Pre-computed TLDR properties are aggressively filtered and truncated to <strong>under 70 words</strong> to enforce punchy scrolling layouts.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-[#1DA1F2] text-xs uppercase tracking-widest mb-2.5 flex items-center gap-1.5 font-sans">
                  ⛓️ Dual-Cache Architecture Specification
                </h3>
                <p className="font-sans italic text-[14px]">
                  To maximize client rendering speeds, the application on startup fetches 100 posts to an offline <strong>IndexedDB (Dexie)</strong> store. The active Viewport RAM is populated with the initial 20 items. Silent background fetching loads more items whenever unread segments fall below 30 posts.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Core Timeline Dashboard */}
      <main className="flex-1 w-full bg-[#E6ECF0]">
        <Timeline />
      </main>
    </div>
  );
}
