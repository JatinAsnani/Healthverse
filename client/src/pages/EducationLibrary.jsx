import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  Bandage,
  Pill,
  AlertTriangle,
  ShieldCheck,
  HeartPulse,
  Clock,
  Search,
  ChevronRight,
  X,
  FileText,
} from "lucide-react";
import useAuthStore from "../store/useAuthStore.js";

export function EducationLibrary() {
  const { t } = useTranslation();
  const { language, setLanguage } = useAuthStore();

  const [articles, setArticles] = useState([]);
  const [activeTopic, setActiveTopic] = useState("all");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState(null);

  useEffect(() => {
    fetchArticles();
  }, [language, activeTopic]);

  const fetchArticles = async () => {
    try {
      setIsLoading(true);
      const url = `/api/v1/education?language=${language}${activeTopic !== "all" ? `&topic=${activeTopic}` : ""}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setArticles(json.data || []);
      }
    } catch (e) {
      console.warn("Network error loading education articles:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const getTopicIcon = (topic) => {
    switch (topic) {
      case "wound_care":
        return Bandage;
      case "medication_adherence":
        return Pill;
      case "warning_signs":
        return AlertTriangle;
      case "pmjay_benefits":
        return ShieldCheck;
      default:
        return HeartPulse;
    }
  };

  const filteredArticles = articles.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.title?.toLowerCase().includes(q) || a.summary?.toLowerCase().includes(q)
    );
  });

  const topicOptions = [
    { id: "all", label: "All Guides" },
    { id: "wound_care", label: "Wound Care" },
    { id: "medication_adherence", label: "Medicines" },
    { id: "warning_signs", label: "Warning Signs (108)" },
    { id: "pmjay_benefits", label: "PM-JAY Scheme" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
      {/* Sleek Minimalist Micro-Header */}
      <div className="card-clean p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="icon-box !w-10 !h-10 bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
              Post-Discharge Recovery Guides
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Practical care instructions in English, Hindi, and Gujarati.
              Offline accessible.
            </p>
          </div>
        </div>

        {/* Minimal Language Switcher */}
        <div className="pill-track self-start sm:self-auto">
          {["en", "hi", "gu"].map((lng) => (
            <button
              key={lng}
              onClick={() => setLanguage(lng)}
              className={`pill-item ${language === lng ? "pill-item-active" : ""}`}
            >
              {lng === "en" ? "EN" : lng === "hi" ? "हिंदी" : "ગુજ"}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Track & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="pill-track overflow-x-auto scrollbar-none w-full sm:w-auto">
          {topicOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setActiveTopic(opt.id)}
              className={`pill-item whitespace-nowrap ${
                activeTopic === opt.id ? "pill-item-active" : ""
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search guides..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>
      </div>

      {/* Guides Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="card-clean p-5 h-40 skeleton-shimmer space-y-3"
            />
          ))}
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="card-clean p-10 text-center space-y-2">
          <FileText className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            No recovery guides match your current filter.
          </p>
          <button
            onClick={() => {
              setActiveTopic("all");
              setSearch("");
            }}
            className="text-xs text-teal-600 dark:text-teal-400 font-bold hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredArticles.map((article) => {
            const Icon = getTopicIcon(article.topic);
            return (
              <div
                key={article._id}
                onClick={() => setSelectedArticle(article)}
                className="card-clean p-4 sm:p-5 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/60">
                      <Icon className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                      <span className="capitalize">
                        {article.topic.replace("_", " ")}
                      </span>
                    </span>
                    <span className="label-micro flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{article.readingTimeMinutes || 3} min read</span>
                    </span>
                  </div>

                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors leading-snug">
                    {article.title}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">
                    {article.summary}
                  </p>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1 flex-wrap">
                    {article.tags?.slice(0, 3).map((tg, i) => (
                      <span
                        key={i}
                        className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded"
                      >
                        #{tg}
                      </span>
                    ))}
                  </div>
                  <span className="text-xs font-bold text-teal-600 dark:text-teal-400 inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                    <span>Read Guide</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Slide-out / Modal Reading Drawer */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
                  <span className="capitalize">
                    {selectedArticle.topic.replace("_", " ")}
                  </span>
                </span>
                <span className="label-micro flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>
                    {selectedArticle.readingTimeMinutes || 3} min read
                  </span>
                </span>
              </div>
              <button
                onClick={() => setSelectedArticle(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Close guide"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {selectedArticle.title}
              </h2>

              <p className="p-3 rounded-xl bg-teal-50/60 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/50 text-slate-800 dark:text-slate-200 font-medium">
                {selectedArticle.summary}
              </p>

              <div className="whitespace-pre-line text-xs font-normal text-slate-800 dark:text-slate-200 leading-relaxed space-y-2">
                {selectedArticle.body}
              </div>

              {selectedArticle.tags && selectedArticle.tags.length > 0 && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 flex-wrap">
                  {selectedArticle.tags.map((tg, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded"
                    >
                      #{tg}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedArticle(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EducationLibrary;
