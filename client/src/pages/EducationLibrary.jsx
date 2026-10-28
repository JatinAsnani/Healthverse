import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  Bandage,
  Pill,
  AlertTriangle,
  ShieldCheck,
  HeartPulse,
  Clock,
  Tag,
  Search,
  Globe
} from 'lucide-react';
import useAuthStore from '../store/useAuthStore.js';

export function EducationLibrary() {
  const { t } = useTranslation();
  const { language, setLanguage } = useAuthStore();

  const [articles, setArticles] = useState([]);
  const [activeTopic, setActiveTopic] = useState('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchArticles();
  }, [language, activeTopic]);

  const fetchArticles = async () => {
    try {
      setIsLoading(true);
      const url = `/api/v1/education?language=${language}${activeTopic !== 'all' ? `&topic=${activeTopic}` : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setArticles(json.data || []);
      }
    } catch (e) {
      console.warn('Network error loading education articles:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const getTopicIcon = (topic) => {
    switch (topic) {
      case 'wound_care': return Bandage;
      case 'medication_adherence': return Pill;
      case 'warning_signs': return AlertTriangle;
      case 'pmjay_benefits': return ShieldCheck;
      default: return HeartPulse;
    }
  };

  const filteredArticles = articles.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return a.title?.toLowerCase().includes(q) || a.summary?.toLowerCase().includes(q);
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner */}
      <div className="card-premium p-6 bg-gradient-to-r from-teal-700 via-teal-800 to-emerald-800 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-6 h-6 text-teal-200" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">
                Multilingual Post-Discharge Health Guides
              </h1>
              <p className="text-teal-100 text-xs mt-1">
                Practical, accessible recovery guides in English, Hindi, and Gujarati. Offline accessible.
              </p>
            </div>
          </div>

          {/* Quick Language Toggle */}
          <div className="flex items-center gap-1.5 bg-black/20 p-1.5 rounded-xl border border-white/10 text-xs font-bold">
            <Globe className="w-4 h-4 text-teal-200 ml-1" />
            {['en', 'hi', 'gu'].map((lng) => (
              <button
                key={lng}
                onClick={() => setLanguage(lng)}
                className={`px-3 py-1 rounded-lg uppercase tracking-wider transition-colors ${
                  language === lng ? 'bg-white text-teal-900 shadow-sm' : 'text-teal-200 hover:text-white'
                }`}
              >
                {lng === 'en' ? 'EN' : lng === 'hi' ? 'हिंदी' : 'ગુજ'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Topics & Search Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex rounded-xl bg-slate-200/80 p-1 overflow-x-auto w-full sm:w-auto text-xs font-bold">
          {[
            { id: 'all', label: 'All Topics' },
            { id: 'wound_care', label: 'Wound Care' },
            { id: 'medication_adherence', label: 'Medicines' },
            { id: 'warning_signs', label: 'Warning Signs (108)' },
            { id: 'pmjay_benefits', label: 'PM-JAY Benefits' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTopic(t.id)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                activeTopic === t.id ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search guides..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs font-medium"
          />
        </div>
      </div>

      {/* Articles Grid */}
      {isLoading ? (
        <div className="py-12 text-center text-slate-500 text-sm">Loading recovery guides...</div>
      ) : filteredArticles.length === 0 ? (
        <div className="card-premium p-8 text-center text-slate-500 text-sm">
          No articles found for the selected language or topic.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredArticles.map((article) => {
            const Icon = getTopicIcon(article.topic);
            return (
              <div key={article._id} className="card-premium p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
                      <Icon className="w-3.5 h-3.5 text-teal-600" />
                      <span className="capitalize">{article.topic.replace('_', ' ')}</span>
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 font-semibold">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{article.readingTimeMinutes || 3} min read</span>
                    </span>
                  </div>

                  <h2 className="text-lg font-extrabold text-slate-900 leading-snug mb-2">
                    {article.title}
                  </h2>
                  <p className="text-xs text-slate-600 font-medium mb-4">
                    {article.summary}
                  </p>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-line">
                    {article.body}
                  </div>
                </div>

                {article.tags && article.tags.length > 0 && (
                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
                    {article.tags.map((tg, i) => (
                      <span key={i} className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        #{tg}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default EducationLibrary;
