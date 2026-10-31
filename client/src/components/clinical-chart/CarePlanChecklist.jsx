import React, { useState } from "react";
import {
  ClipboardCheck,
  Clock,
  CheckSquare,
  Square,
} from "lucide-react";

/**
 * CarePlanChecklist
 * Displays post-discharge clinical milestones with interactive completion toggles
 */
export function CarePlanChecklist({ initialItems = [], onItemToggle }) {
  const [items, setItems] = useState(initialItems);

  React.useEffect(() => {
    if (initialItems && initialItems.length > 0) {
      setItems(initialItems);
    }
  }, [initialItems]);

  const handleToggle = (id) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextStatus =
            item.status === "completed" ? "pending" : "completed";
          if (onItemToggle) {
            onItemToggle(id, nextStatus);
          }
          return { ...item, status: nextStatus };
        }
        return item;
      }),
    );
  };

  const completedCount = items.filter((i) => i.status === "completed").length;
  const progressPercent =
    items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  return (
    <div className="card-clean p-4 sm:p-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="icon-box !w-7 !h-7 bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
            <ClipboardCheck className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Care Plan Milestones
            </h3>
            <p className="text-[10px] text-slate-400">
              Protocol checklist &bull; {completedCount} of {items.length}{" "}
              completed
            </p>
          </div>
        </div>

        {/* Progress pill */}
        <div className="flex items-center gap-2">
          <div className="w-20 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-[11px] font-bold font-tabular text-teal-600 dark:text-teal-400">
            {progressPercent}%
          </span>
        </div>
      </div>

      {/* Empty State */}
      {items.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-400">
          No care plan milestones assigned.
        </div>
      ) : (
        /* Checklist items */
        <div className="space-y-2">
          {items.map((item) => {
            const isDone = item.status === "completed";

            return (
              <div
                key={item.id}
                onClick={() => handleToggle(item.id)}
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                  isDone
                    ? "bg-slate-50/50 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-800/60 opacity-70"
                    : "bg-white dark:bg-slate-850 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                {/* Interactive Checkbox */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggle(item.id);
                  }}
                  className="mt-0.5 text-teal-600 dark:text-teal-400 focus:outline-none"
                  aria-label={`Mark "${item.title}" as ${isDone ? "pending" : "completed"}`}
                >
                  {isDone ? (
                    <CheckSquare className="w-4 h-4 text-teal-600" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span
                      className={`text-xs font-semibold ${
                        isDone
                          ? "line-through text-slate-400 dark:text-slate-500"
                          : "text-slate-800 dark:text-slate-100"
                      }`}
                    >
                      {item.title}
                    </span>

                    {/* Due Date & Category Pill */}
                    <div className="flex items-center gap-1.5">
                      <span className="label-micro">{item.category}</span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded flex items-center gap-1 ${
                          isDone
                            ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                            : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300"
                        }`}
                      >
                        <Clock className="w-2.5 h-2.5" />
                        <span>{item.dueDate}</span>
                      </span>
                    </div>
                  </div>

                  {item.notes && (
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">
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
