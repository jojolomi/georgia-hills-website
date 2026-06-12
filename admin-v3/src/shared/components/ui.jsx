import React from "react";

export function Card({ title, children, actions }) {
  return (
    <section className="card">
      {(title || actions) && (
        <div className="topbar" style={{ marginBottom: "0.7rem" }}>
          <h2 style={{ margin: 0, fontSize: "1rem" }}>{title}</h2>
          <div className="stack">{actions}</div>
        </div>
      )}
      {children}
    </section>
  );
}

export function Table({ columns, rows }) {
  return (
    <table className="table">
      <thead>
        <tr>{columns.map((col) => <th key={col}>{col}</th>)}</tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr><td colSpan={columns.length} className="muted">No data</td></tr>
        ) : rows.map((row, i) => <tr key={i}>{row.map((cell, c) => <td key={c}>{cell}</td>)}</tr>)}
      </tbody>
    </table>
  );
}
