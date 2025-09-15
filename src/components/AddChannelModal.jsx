
// components/AddChannelModal.jsx
import React from 'react';

export default function AddChannelModal({ onShowPublicChannelForm, onShowUserList, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-card p-6 rounded-lg shadow-xl w-full max-w-sm text-foreground space-y-4">
        <h2 className="text-xl font-bold text-center">Buat atau Mulai Obrolan</h2>
        <p className="text-center text-sm text-muted-foreground">Pilih tindakan untuk membuat saluran baru atau memulai pesan langsung.</p>
        <div className="flex flex-col space-y-2">
          <button
            onClick={onShowPublicChannelForm}
            className="w-full py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Buat Channel Publik
          </button>
          <button
            onClick={onShowUserList}
            className="w-full py-2 bg-secondary text-foreground rounded-md hover:bg-muted transition-colors"
          >
            Mulai DM Baru
          </button>
          <button
            onClick={onClose}
            className="w-full py-2 bg-transparent text-muted-foreground rounded-md hover:bg-muted transition-colors"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
