import { useEffect, useState } from "react";

import type { ItemRow } from "../api";

interface ItemNoteEditorProps {
  item: ItemRow | null;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (item: ItemRow, noteText: string) => Promise<void>;
}

export default function ItemNoteEditor({
  item,
  saving,
  error,
  onClose,
  onSave,
}: ItemNoteEditorProps) {
  const [noteText, setNoteText] = useState("");

  useEffect(() => {
    setNoteText(item?.note_text ?? "");
  }, [item]);

  if (item === null) {
    return null;
  }

  const modifiedLabel = item.note_last_modified
    ? item.note_last_modified.replace("T", " ").slice(0, 16)
    : "No note yet";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      role="presentation"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-label="Edit item note"
        className="w-full max-w-xl rounded-xl border border-slate-300 bg-white p-4 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="mb-3">
          <h2 className="text-lg font-semibold text-slate-900">Note</h2>
          <p className="line-clamp-2 text-sm text-slate-600">{item.title}</p>
          <p className="mt-1 text-xs text-slate-500">Last updated: {modifiedLabel}</p>
        </header>

        <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="item-note-text">
          Personal note
        </label>
        <textarea
          id="item-note-text"
          value={noteText}
          onChange={(event) => setNoteText(event.target.value)}
          className="min-h-36 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800"
          placeholder="Add your note (for example: max bid, seller preference, item condition reminders)"
        />

        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onSave(item, noteText)}
            className="rounded-md border border-blue-700 bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save note"}
          </button>
        </div>
      </section>
    </div>
  );
}
