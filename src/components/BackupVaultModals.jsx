import React from 'react';
import { X, Archive, RefreshCw, Layers } from 'lucide-react';

export function ImportInspectorModal({
  payload,
  selectedIds,
  onToggleSelection,
  onExecuteImport,
  onClose
}) {
  if (!payload) return null;

  return (
    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0d0d0d] border border-white/15 rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-white block">
              Inspect & Restore Tracks
            </span>
            <span className="text-[10px] text-neutral-400">
              Select specific tasks to extract from this backup:
            </span>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
          {payload.tasks?.map((t) => {
            const isSelected = selectedIds.has(t.id);
            const loggedDays = t.matrix ? t.matrix.filter((v) => v > 0).length : 0;

            return (
              <div
                key={t.id}
                onClick={() => onToggleSelection(t.id)}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                  isSelected 
                    ? 'bg-white/10 border-white/30 text-white' 
                    : 'bg-[#141414] border-white/5 text-neutral-500 hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="rounded bg-black border-white/20 accent-white cursor-pointer"
                  />
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.hex }} />
                  <span className="text-xs font-bold uppercase">{t.title}</span>
                </div>
                <span className="text-[9px] font-mono text-neutral-400">{loggedDays} Days</span>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
          <button
            disabled={selectedIds.size === 0}
            onClick={() => onExecuteImport('active')}
            className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors ${
              selectedIds.size === 0 
                ? 'bg-white/5 text-white/20 cursor-default' 
                : 'bg-white text-black hover:bg-neutral-200 cursor-pointer'
            }`}
          >
            Restore Selected to Timeline ({selectedIds.size})
          </button>

          <button
            disabled={selectedIds.size === 0}
            onClick={() => onExecuteImport('vault')}
            className={`w-full py-2 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-colors border ${
              selectedIds.size === 0 
                ? 'border-white/5 text-white/20 cursor-default' 
                : 'border-amber-400/40 text-amber-400 hover:bg-amber-400/10 cursor-pointer'
            }`}
          >
            Send Selected Straight to Vault
          </button>
        </div>
      </div>
    </div>
  );
}

export function RevisionsModal({
  isOpen,
  onClose,
  revisions,
  onRollback
}) {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0d0d0d] border border-white/15 rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-cyan-400" />
            <span className="text-[11px] font-black uppercase tracking-widest text-white">Board Snapshots</span>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
          {revisions.length === 0 ? (
            <div className="text-center py-8 text-neutral-600 text-xs">No previous snapshots stored.</div>
          ) : (
            revisions.map((rev) => (
              <div key={rev.id} className="flex items-center justify-between p-2.5 rounded-lg bg-[#141414] border border-white/5">
                <div>
                  <div className="text-xs font-bold text-white">{rev.reason}</div>
                  <div className="text-[9px] text-neutral-500">{rev.at} · {rev.tasks?.length} Tasks</div>
                </div>
                <button
                  onClick={() => onRollback(rev)}
                  className="px-2.5 py-1 bg-white text-black hover:bg-neutral-200 text-[9px] font-black uppercase tracking-wider rounded cursor-pointer"
                >
                  Restore
                </button>
              </div>
            ))
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full py-2 bg-white/5 hover:bg-white/10 text-neutral-300 font-bold uppercase text-[10px] rounded-lg cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export function VaultDrawer({
  isOpen,
  onClose,
  archivedTasks,
  onRestoreTask,
  purgeConfirmId,
  setPurgeConfirmId,
  purgeInputText,
  setPurgeInputText,
  onHardPurgeTask
}) {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-md bg-[#0a0a0a] border-l border-white/10 h-full p-6 flex flex-col justify-between shadow-2xl">
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Archive size={16} className="text-amber-400" />
              <span className="text-xs font-black uppercase tracking-widest text-white">Task Archive Vault</span>
            </div>
            <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors cursor-pointer">
              <X size={16} />
            </button>
          </div>

          <div className="mt-6 flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-180px)] pr-2">
            {archivedTasks.length === 0 ? (
              <div className="text-center py-12 text-neutral-600 text-xs tracking-wider uppercase font-bold">
                No archived tasks in the vault.
              </div>
            ) : (
              archivedTasks.map((t) => {
                const loggedDays = t.matrix.filter((v) => v > 0).length;

                return (
                  <div key={t.id} className="bg-[#121212] border border-white/10 rounded-xl p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.hex }} />
                        <span className="text-xs font-black text-white uppercase">{t.title}</span>
                      </div>
                      <span className="text-[10px] text-neutral-500 font-bold">{loggedDays} Days Total</span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <button
                        onClick={() => onRestoreTask(t.id)}
                        className="flex items-center gap-1.5 px-3 py-1 rounded bg-white text-black hover:bg-neutral-200 text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        <RefreshCw size={11} />
                        <span>Respawn</span>
                      </button>

                      {purgeConfirmId === t.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Type DELETE"
                            autoFocus
                            value={purgeInputText}
                            onChange={(e) => setPurgeInputText(e.target.value)}
                            className="w-24 bg-black border border-red-500/50 rounded px-1.5 py-0.5 text-[9px] text-red-300 outline-none uppercase"
                          />
                          <button
                            onClick={() => onHardPurgeTask(t.id)}
                            disabled={purgeInputText.trim().toUpperCase() !== 'DELETE'}
                            className={`px-2 py-1 rounded text-[9px] font-bold uppercase transition-colors ${
                              purgeInputText.trim().toUpperCase() === 'DELETE' 
                                ? 'bg-red-600 text-white cursor-pointer' 
                                : 'bg-red-950/40 text-red-500/40 cursor-default'
                            }`}
                          >
                            Purge
                          </button>
                          <button onClick={() => setPurgeConfirmId(null)} className="text-neutral-500 hover:text-white text-xs">
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setPurgeConfirmId(t.id);
                            setPurgeInputText('');
                          }}
                          className="text-red-400 hover:text-red-300 text-[10px] font-bold tracking-wider uppercase transition-colors cursor-pointer"
                        >
                          Hard Erase
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-white/10 text-[9px] text-neutral-500 leading-relaxed">
          Vaulted tasks keep 100% of their historical days intact. Respawning them automatically restores them to the active timeline without overwriting existing lanes.
        </div>
      </div>
    </div>
  );
}