"use client";

import { useState } from "react";

export function ContentRowsPanel({
  rows,
  addLabel,
  emptyText,
  renderThumb,
  renderInfo,
  confirmText,
  deleteAction,
  renderForm,
}) {
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);

  const close = () => {
    setEditing(null);
    setAdding(false);
  };

  return (
    <div>
      <div className="admin-toolbar">
        <div className="admin-toolbar-end">
          <button type="button" className="admin-btn" onClick={() => setAdding(true)}>
            {addLabel}
          </button>
        </div>
      </div>

      <div className="admin-list">
        {(rows || []).map((row, i) => (
          <div key={row.id || i} className="admin-row">
            <div className="admin-row-thumb">{renderThumb(row, i)}</div>
            <div className="admin-row-info">{renderInfo(row, i)}</div>
            <div className="admin-actions">
              <button
                type="button"
                className="admin-btn"
                onClick={() => setEditing(row)}
              >
                Edit
              </button>
              <form action={deleteAction} className="inline">
                <input type="hidden" name="id" value={row.id} />
                <button
                  type="submit"
                  className="admin-btn admin-btn-danger"
                  onClick={(e) => {
                    if (!window.confirm(confirmText(row))) e.preventDefault();
                  }}
                >
                  Delete
                </button>
              </form>
            </div>
          </div>
        ))}
        {(rows || []).length === 0 ? <p className="rep-empty">{emptyText}</p> : null}
      </div>

      {adding || editing ? renderForm({ row: editing || {}, onClose: close }) : null}
    </div>
  );
}