"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "@/app/utils/auth"; // Using the correct path alias
import Link from "next/link";

export default function NewChannelPage() {
  const router = useRouter();
  const { user, loading, api, logout } = useAuth(); // Using useAuth hook
  const [name, setName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check authentication. useAuth already handles loading and redirect.
  // This code just waits for the user to load and redirects if there is none.
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  const handleCreate = async (e) => {
    if (e) e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Channel name cannot be empty!");
      return;
    }

    if (name.trim().length > 50) {
      toast.error("Channel name is too long (max. 50 characters)!");
      return;
    }

    if (!user?.token) {
      toast.error("Invalid token. Please log in again.");
      logout(); // Call the logout function from useAuth
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post("/api/channels", { name: name.trim(), isPrivate });

      console.log("Debug: Create response full:", res.data);
      
      const channelId = res.data.channel?._id || res.data._id || res.data.id;
      if (!channelId) {
        throw new Error("No channel ID in response");
      }

      toast.success("Channel created successfully!");
      
      setTimeout(() => {
        console.log("Debug: Redirecting to /channels?id=", channelId);
        router.push(`/channels?id=${channelId}`);
      }, 2000);
      
    } catch (err) {
      console.error("Error creating channel:", err);
      
      let errorMessage = "Failed to create channel";
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.data?.details) {
        errorMessage = Object.values(err.response.data.details).join(', ');
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Show a loading screen if useAuth is still loading
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If there's no user, redirect is already handled by useEffect
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 text-foreground">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      
      <div className="bg-card p-6 rounded-lg shadow-md w-full max-w-md border border-border">
        <h1 className="text-2xl font-bold mb-6 text-center text-foreground">Create New Channel</h1>
        
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Channel Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-border bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter channel name"
              required
              maxLength={50}
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isPrivate"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
            />
            <label htmlFor="isPrivate" className="ml-2 block text-sm text-foreground">
              Private Channel (members only)
            </label>
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => router.push("/channels")}
              className="flex-1 px-4 py-2 bg-muted text-foreground rounded-md hover:bg-muted/70 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin inline-block mr-2">⟳</span>
                  Creating...
                </>
              ) : (
                "Create Channel"
              )}
            </button>
          </div>
        </form>
        <p className="mt-4 text-center text-sm text-foreground">
          <Link href="/channels" className="text-primary hover:underline">
            Back to Channels
          </Link>
        </p>
      </div>
    </div>
  );
}
