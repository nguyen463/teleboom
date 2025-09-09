"use client";

import { useState } from "react";

export default function ChatLayout({ user }) {
  const [messages, setMessages] = useState([
    // contoh dummy messages
    { id: 1, text: "Halo semua!", userId: 2 },
    { id: 2, text: "Hai, ini saya.", userId: user.id },
  ]);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");

  // 🔹 Edit pesan
  const handleEdit = (msg) => {
    setEditingId(msg.id);
    setEditText(msg.text);
  };

  const saveEdit = (id) => {
    setMessages(
      messages.map((msg) =>
        msg.id === id ? { ...msg, text: editText } : msg
      )
    );
    setEditingId(null);
    setEditText("");
  };

  // 🔹 Delete pesan
  const handleDelete = (id) => {
    setMessages(messages.filter((msg) => msg.id !== id));
  };

  return (
    <div className="p-4 h-screen bg-gray-100 flex flex-col">
      <h2 className="text-xl font-bold mb-4">Chat Room</h2>

      <div className="flex-1 overflow-y-auto space-y-2 mb-4">
        {messages.map((msg) => {
          const isOwn = msg.userId === user.id;
          return (
            <div
              key={msg.id}
              className={`p-2 rounded-md max-w-xs ${
                isOwn ? "bg-blue-500 text-white ml-auto" : "bg-gray-200 text-gray-900"
              }`}
            >
              {editingId === msg.id ? (
                <div className="flex space-x-2">
                  <input
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="flex-1 p-1 rounded border"
                  />
                  <button
                    onClick={() => saveEdit(msg.id)}
                    className="bg-green-500 text-white px-2 rounded"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="bg-gray-400 text-white px-2 rounded"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <span>{msg.text}</span>
                  {isOwn && (
                    <div className="flex space-x-1 ml-2">
                      <button
                        onClick={() => handleEdit(msg)}
                        className="text-sm text-yellow-200 hover:text-yellow-400"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(msg.id)}
                        className="text-sm text-red-400 hover:text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Input form */}
      <div className="flex space-x-2">
        <input
          type="text"
          placeholder="Tulis pesan..."
          className="flex-1 p-2 border rounded-md"
        />
        <button className="bg-blue-500 text-white px-4 rounded-md">Kirim</button>
      </div>
    </div>
  );
}
