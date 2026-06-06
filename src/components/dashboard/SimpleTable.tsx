import type { ReactNode } from "react";

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

/** Minimal responsive table for admin/partner lists. */
export function SimpleTable<T>({
  columns,
  rows,
  keyOf,
  empty = "No records.",
}: {
  columns: Column<T>[];
  rows: T[];
  keyOf: (row: T) => string;
  empty?: string;
}) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <div className="glass-card overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border/60 text-xs uppercase text-muted-foreground">
            {columns.map((c) => (
              <th key={c.header} className="px-4 py-3 font-medium">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={keyOf(row)} className="border-b border-border/30 last:border-0">
              {columns.map((c) => (
                <td key={c.header} className={`px-4 py-3 text-foreground ${c.className ?? ""}`}>
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
