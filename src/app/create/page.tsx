"use client";

import { useState } from "react";

export default function CreatePage() {
  const [amount, setAmount] = useState("");
  const [link, setLink] = useState("");

  const handleCreate = async () => {
    // Mocking link creation
    const secret = Math.random().toString(36).substring(7);
    setLink(`http://localhost:3000/claim#${secret}`);
  };

  return (
    <div className="max-w-md w-full bg-slate-900 p-8 rounded-2xl border border-slate-800 space-y-6">
      <h2 className="text-2xl font-bold">Create PayLink</h2>
      <div className="space-y-2">
        <label className="text-sm text-slate-400">Amount (XLM)</label>
        <input 
          type="number" 
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full bg-slate-950 border border-slate-700 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>
      <button 
        onClick={handleCreate}
        className="w-full bg-blue-600 hover:bg-blue-700 p-4 rounded-lg font-bold transition"
      >
        Generate Link
      </button>

      {link && (
        <div className="mt-6 p-4 bg-slate-950 rounded-lg border border-dashed border-slate-700">
          <p className="text-sm text-slate-400 mb-2">Share this link:</p>
          <p className="text-xs break-all text-blue-400">{link}</p>
        </div>
      )}
    </div>
  );
}
