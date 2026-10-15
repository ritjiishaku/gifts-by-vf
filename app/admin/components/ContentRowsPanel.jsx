"use client";

import { useMemo, useState } from "react";
import { matchesQuery, sortRows, visFilter } from "@/lib/admin-list";

export function ContentRowsPanel({
  rows,
  addLabel,
  emptyText,
  renderThumb,
  renderInfo,
  confirmText,
  deleteAction,
  renderForm,
  // Optional list UX (all default off so simple panels stay simple):
  searchKeys, // e.g. ["caption", "category"] — enables the search box
  searchPlaceholder = "Search…",
  sortable = false, // adds Display order / Name A–Z / Newest sort select
  filterVisibility = false, // adds All / Visible / Hidden select (is_visible rows)
  // Controlled state (from the dashboard, so it survives tab switches).
  // Falls back to internal state when the props are not supplied.
  query: queryProp,
  onQueryChange,
  sort: sortProp,
  onSortChange,
  vis: visProp,
  onVisChange,
}) {
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [innerQ, setInnerQ] = useState("");
  const [innerSort, setInnerSort] = useState("order");
  const [innerVis, setInnerVis] = useState("all");

  const q = queryProp !== undefined ? queryProp : innerQ;
  const setQ = onQueryChange || setInnerQ;
  const sort = sortProp !== undefined ? sortProp : innerSort;
  const setSort = onSortChange || setInnerSort;
  const vis = visProp !== undefined ? visProp : innerVis;
  const setVis = onVisChange || setInnerVis;

  const close = () => {
    setEditing(null);
    setAdding(false);
  };

  const visibleRows = useMemo(() => {
    let out = rows || [];
    out = out.filter((row) => matchesQuery(row, searchKeys, q));
    if (filterVisibility) out = visFilter(out, vis);
    return sortRows(out, sort);
  }, [rows, searchKeys, q, sort, vis, filterVisibility]);

  const total = (rows || []).length;
  const filtered = Boolean(q.trim()) || (filterVisibility && vis !== "all");

  return (
    <div>
      <div className="admin-toolbar">
        <div className="admin-list-filters">
          {searchKeys ? (
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={searchPlaceholder}
              className="admin-search"
              aria-label={searchPlaceholder}
            />
          ) : null}
          {sortable ? (
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="admin-filter"
              aria-label="Sort"
            >
              <option value="order">Sort: display order</option>
              <option value="name">Sort: name A–Z</option>
              <option value="newest">Sort: newest first</option>
            </select>
          ) : null}
          {filterVisibility ? (
            <select
              value={vis}
              onChange={(e) => setVis(e.target.value)}
              className="admin-filter"
              aria-label="Visibility"
            >
              <option value="all">All</option>
              <option value="visible">Visible only</option>
              <option value="hidden">Hidden only</option>
            </select>
          ) : null}
        </div>
        <div className="admin-toolbar-end">
          <button type="button" className="admin-btn" onClick={() => setAdding(true)}>
            {addLabel}
          </button>
        </div>
      </div>

      <div className="admin-list">
        {visibleRows.map((row, i) => (
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
        {visibleRows.length === 0 ? (
          <p className="rep-empty">
            {filtered ? `Nothing matches “${q.trim()}”.` : emptyText}
          </p>
        ) : null}
      </div>

      {filtered ? (
        <p className="admin-list-count">
          Showing {visibleRows.length} of {total}
        </p>
      ) : null}

      {adding || editing ? renderForm({ row: editing || {}, onClose: close }) : null}
    </div>
  );
}
