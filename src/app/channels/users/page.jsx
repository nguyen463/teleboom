// src/app/channels/users/page.jsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "../../utils/auth";

export default function UsersListPage() {
  const { user, loading, api, logout } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleStartDm = useCallback((otherUserId) => {
    if (api?.socket) {
      api.socket.emit("startDm", otherUserId, (response) => {
        if (response?.success && response.channelId) {
          toast.success("DM started successfully!");
          router.push(`/channels?id=${response.channelId}`);
        } else {
          toast.error(response?.error || "Failed to start DM.");
        }
      });
    }
  }, [api, router]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }
    if (!user) return;

    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const response = await api.get("/api/users");
        setUsers(response.data.users || response.data);
      } catch (err) {
        console.error("Failed to fetch users:", err);
        setError("Failed to load users.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, [user, loading, api, router]);

  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
        <p className="text-foreground">Loading users...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col items-center">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="w-full max-w-2xl bg-card p-6 rounded-lg shadow-md border border-border">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-foreground">Start a New DM</h1>
          <button onClick={() => router.push('/channels')} className="text-sm text-primary hover:underline">
            Back to Channels
          </button>
        </div>
        <ul className="space-y-3">
          {users.filter(u => u._id !== user.id).map(otherUser => (
            <li key={otherUser._id}>
              <button
                onClick={() => handleStartDm(otherUser._id)}
                className="w-full text-left p-4 bg-muted rounded-md hover:bg-accent transition-colors"
              >
                <span className="font-medium">{otherUser.displayName}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
