// components/UserList.jsx
import React, { useState, useEffect } from 'react';

export default function UserList({ user, onStartDm, onClose, api }) {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const response = await api.get("/api/users");
        // API response might be an object with a users array or the array itself.
        const usersData = response.data.users || response.data;
        // Filter out the currently logged-in user from the list
        setUsers(usersData.filter(u => u._id !== user.id));
      } catch (err) {
        console.error("Gagal mengambil daftar pengguna:", err);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, [api, user]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-card p-6 rounded-lg shadow-xl w-full max-w-md text-foreground flex flex-col h-auto max-h-[80vh]">
        <div className="flex justify-between items-center pb-4 border-b border-border">
          <h2 className="text-xl font-bold">Mulai DM baru</h2>
          <button onClick={onClose} className="text-foreground/50 hover:text-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <ul className="space-y-2 overflow-y-auto pt-4 flex-1">
          {loadingUsers ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            users.map(otherUser => (
              <li key={otherUser._id}>
                <button
                  onClick={() => onStartDm(otherUser._id)}
                  className="w-full text-left p-3 rounded-md hover:bg-muted transition-colors"
                >
                  {otherUser.displayName}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
