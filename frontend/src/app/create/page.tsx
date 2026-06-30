"use client";

import { useState } from "react";

export default function CreatePage() {
  const [amount, setAmount] = useState("");
  const [link, setLink] = useState("");

  const handleCreate = async () => {
    const secret = Math.random().toString(36).substring(7);
    setLink(`http://localhost:3000/claim#${secret}`);
  };

  return (
    <div className="card">
      <h2 className="card-title">Create PayLink</h2>
      <div className="card-flush">
        <label className="input-label">Amount (XLM)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="input"
        />
      </div>
      <button onClick={handleCreate} className="btn-primary">
        Generate Link
      </button>

      {link && (
        <div className="link-preview">
          <p className="input-label">Share this link:</p>
          <p className="mono-text">{link}</p>
        </div>
      )}
    </div>
  );
}
