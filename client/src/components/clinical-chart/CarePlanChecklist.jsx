import React, { useState } from 'react';
import {
  ClipboardCheck,
  CheckCircle2,
  Clock,
  CheckSquare,
  Square,
  Calendar,
  AlertCircle
} from 'lucide-react';

/**
 * CarePlanChecklist
 * Displays post-discharge clinical milestones with interactive completion toggles
 */
export function CarePlanChecklist({
  initialItems = [],
  onItemToggle
}) {
  const [items, setItems] = useState(initialItems);

  // Sync state if initialItems change
  React.useEffect(() => {
    if (initialItems && initialItems.length > 0) {
      setItems(initialItems);
    }
  }, [initialItems]);

  const handleToggle = (id) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextStatus = item.status === 'completed' ? 'pending' : 'completed';
          if (onItemToggle) {
            onItemToggle(id, nextStatus);
          }
          return { ...item, status: nextStatus };
        }
        return item;
      })
    );
  };

  const completedCount = items.filter((i) => i.status === 'completed').length;
  const progressPercent = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  return (
    <div className="card-premium p-5 sm:p-6 bg-slate-900/90 border border-slate-800 shadow-lg">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-950/70 border border-teal-800/60 flex items-center justify-center text-teal-400">
            <ClipboardCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 tracking-tight">
              Care Plan Milestones
            </h3>
            <p className="text-[11px] text-slate-400">
              Protocol checklist &bull; {completedCount} of {items.length} completed ({progressPercent}%)
            </p>
          </div>
        </div>

        {/* Progress pill */}
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs font-extrabold text-teal-400">
            {progressPercent}%
          </span>
        </div>
      </div>

      {/* Empty State */}
      {items.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400">
          No care plan milestones assigned for this patient.
        </div>
      ) : (
        /* Checklist items */
        <div className="space-y-2.5">
          {items.map((item) => {
            const isDone = item.status === 'completed';

            return (
              <div
                key={item.id}
                onClick={() => handleToggle(item.id)}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                  isDone
                    ? 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700 opacity-80'
                    : 'bg-slate-950/70 border-slate-800 hover:border-teal-700/60'
                }`}
              >
                {/* Interactive Checkbox */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggle(item.id);
                  }}
                  className="mt-0.5 text-teal-400 hover:text-teal-300 focus:outline-none"
                  aria-label={`Mark "${item.title}" as ${isDone ? 'pending' : 'completed'}`}
                >
                  {isDone ? (
                    <CheckSquare className="w-5 h-5 text-teal-400 fill-teal-950" />
                  ) : (
                    <Square className="w-5 h-5 text-slate-500 hover:text-slate-400" />
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <span
                      className={`text-xs sm:text-sm font-bold ${
                        isDone
                          ? 'line-through text-slate-400'
                          : 'text-slate-100'
                      }`}
                    >
                      {item.title}
                    </span>

                    {/* Due Date & Category Pill */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {item.category}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                          isDone
                            ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50'
                            : 'bg-amber-950/60 text-amber-300 border border-amber-800/50'
                        }`}
                      >
                        <Clock className="w-2.5 h-2.5" />
                        <span>{item.dueDate}</span>
                      </span>
                    </div>
                  </div>

                  {item.notes && (
                    <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                      {item.notes}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CarePlanChecklist;

