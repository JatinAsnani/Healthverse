import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Send,
  Clock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

/**
 * Format ISO timestamp into clean relative/readable time
 */
function formatNoteTime(isoString) {
  if (!isoString) return 'Just now';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'Just now';
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return 'Just now';
  }
}

/**
 * ClinicalNotesPanel
 * Previews recent clinical continuity notes with an inline "Add note" form
 */
export function ClinicalNotesPanel({
  initialNotes = [],
  onAddNote
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [isAdding, setIsAdding] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newTag, setNewTag] = useState('Progress Note');
  const [showAll, setShowAll] = useState(false);

  React.useEffect(() => {
    if (initialNotes && initialNotes.length > 0) {
      setNotes(initialNotes);
    }
  }, [initialNotes]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    const newNote = {
      id: `note-${Date.now()}`,
      author: 'Dr. Ananya Sharma',
      role: 'Internal Medicine Clinician',
      timestamp: new Date().toISOString(),
      content: newContent.trim(),
      tags: [newTag, 'Chart Update']
    };

    setNotes((prev) => [newNote, ...prev]);
    if (onAddNote) {
      onAddNote(newNote);
    }
    setNewContent('');
    setIsAdding(false);
  };

  const displayedNotes = showAll ? notes : notes.slice(0, 1);

  return (
    <div className="card-clean p-4 sm:p-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="icon-box !w-7 !h-7 bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
            <FileText className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Progress Notes
            </h3>
            <p className="text-[10px] text-slate-400">
              Continuity-of-care observations &bull; {notes.length} {notes.length === 1 ? 'entry' : 'entries'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors shadow-xs"
        >
          <Plus className="w-3 h-3" />
          <span>{isAdding ? 'Cancel' : 'Add Note'}</span>
        </button>
      </div>

      {/* Inline Add Note Form */}
      {isAdding && (
        <form onSubmit={handleSubmit} className="mb-3.5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-teal-500/30 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-teal-700 dark:text-teal-300 text-xs">New Observation</span>
            <select
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="Progress Note">Progress Note</option>
              <option value="Medication Review">Medication Review</option>
              <option value="Home Visit Check">Home Visit Check</option>
              <option value="Vitals Advisory">Vitals Advisory</option>
              <option value="Discharge Follow-up">Discharge Follow-up</option>
            </select>
          </div>

          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows={3}
            placeholder="Type clinical observations, caregiver updates, or symptom trajectory notes..."
            className="w-full text-xs p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500 leading-relaxed resize-none"
            autoFocus
          />

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400">
              Dr. Ananya Sharma (Clinician)
            </span>
            <button
              type="submit"
              disabled={!newContent.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Send className="w-3 h-3" />
              <span>Save Note</span>
            </button>
          </div>
        </form>
      )}

      {/* Notes List / Preview */}
      {notes.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-400">
          No clinical notes logged yet.
        </div>
      ) : (
        <div className="space-y-2">
          {displayedNotes.map((note) => (
            <div
              key={note.id}
              className="bg-slate-50/70 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-200/70 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
            >
              {/* Note Meta */}
              <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-bold text-[10px] flex items-center justify-center border border-teal-200 dark:border-teal-800">
                    {note.author?.charAt(0) || 'D'}
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {note.author}
                  </span>
                  <span className="text-[10px] text-slate-400">({note.role})</span>
                </div>

                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-tabular">
                  <Clock className="w-2.5 h-2.5" />
                  <span>{formatNoteTime(note.timestamp)}</span>
                </div>
              </div>

              {/* Note Content */}
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {note.content}
              </p>

              {/* Tags */}
              {note.tags && note.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                  {note.tags.map((t, idx) => (
                    <span
                      key={idx}
                      className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Toggle View More/Less if more than 1 note */}
          {notes.length > 1 && (
            <button
              type="button"
              onClick={() => setShowAll(!showAll)}
              className="w-full py-1 text-center text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center justify-center gap-1 transition-colors"
            >
              <span>{showAll ? 'Show latest note only' : `View ${notes.length - 1} older notes`}</span>
              {showAll ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default ClinicalNotesPanel;
