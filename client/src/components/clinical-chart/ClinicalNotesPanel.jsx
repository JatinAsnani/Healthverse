import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Send,
  User,
  Clock,
  Tag,
  CheckCircle2,
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
    return d.toLocaleString('en-US', {
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
 * Previews recent clinical continuity notes with an inline "Add note" modal/form
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

  // Sync state if initialNotes change
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
    <div className="card-premium p-5 sm:p-6 bg-slate-900/90 border border-slate-800 shadow-lg">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-950/70 border border-teal-800/60 flex items-center justify-center text-teal-400">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 tracking-tight">
              Clinical Progress Notes
            </h3>
            <p className="text-[11px] text-slate-400">
              Continuity-of-care observations &bull; {notes.length} {notes.length === 1 ? 'entry' : 'entries'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isAdding ? 'Cancel' : 'Add Note'}</span>
        </button>
      </div>

      {/* Inline Add Note Form */}
      {isAdding && (
        <form onSubmit={handleSubmit} className="mb-4 p-4 rounded-xl bg-slate-950/80 border border-teal-700/50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-400">New Clinical Observation</span>
            <select
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              className="text-xs bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-teal-500"
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
            className="w-full text-xs p-3 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 leading-relaxed resize-none"
            autoFocus
          />

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400">
              Logged as: <strong className="text-slate-200">Dr. Ananya Sharma</strong> (Clinician)
            </span>
            <button
              type="submit"
              disabled={!newContent.trim()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white text-xs font-bold transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Save Note</span>
            </button>
          </div>
        </form>
      )}

      {/* Notes List / Preview */}
      {notes.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-400">
          No clinical notes logged yet. Click &ldquo;Add Note&rdquo; to document an observation.
        </div>
      ) : (
        <div className="space-y-3">
          {displayedNotes.map((note) => (
            <div
              key={note.id}
              className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80 hover:border-slate-700 transition-colors"
            >
              {/* Note Meta */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2 pb-2 border-b border-slate-800/60">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-teal-950 border border-teal-800 flex items-center justify-center text-[10px] font-bold text-teal-300">
                    {note.author?.charAt(0) || 'D'}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-200">
                      {note.author}
                    </h5>
                    <p className="text-[10px] text-slate-400">{note.role}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span>{formatNoteTime(note.timestamp)}</span>
                </div>
              </div>

              {/* Note Content */}
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                {note.content}
              </p>

              {/* Tags */}
              {note.tags && note.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2 border-t border-slate-800/50">
                  {note.tags.map((t, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-800/80 text-teal-300 border border-slate-700"
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
              className="w-full py-2 text-center text-xs font-bold text-teal-400 hover:text-teal-300 flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>{showAll ? 'Show latest note only' : `View older notes (${notes.length - 1} more)`}</span>
              {showAll ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default ClinicalNotesPanel;

