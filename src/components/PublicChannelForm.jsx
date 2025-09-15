
// components/PublicChannelForm.jsx
import React, { useState } from 'react';

export default function PublicChannelForm({ onCreate, onClose, isLoading }) {
  const [name, setName] = useState("");
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-card p-6 rounded-lg shadow-xl w-full max-w-md text-foreground">
        <h2 className="text-xl font-bold mb-4">Buat Channel Publik</h2>
        <form onSubmit={(e) => { e.preventDefault(); onCreate(name); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Nama Channel</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-border bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="contoh: obrolan-umum"
              required
              maxLength={50}
            />
          </div>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-muted text-foreground rounded-md hover:bg-muted/70 transition-colors"
              disabled={isLoading}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isLoading ? "Membuat..." : "Buat Channel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
