// app/create-channel/page.jsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/utils/auth";
import Link from "next/link";

export default function CreatePublicChannelPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { user } = useAuth();

  // 🔑 URL backend dari environment variable
  const API_URL =
    process.env.NEXT_PUBLIC_API_URL ||
    "https://teleboom-backend.herokuapp.com";

  const handleCreateChannel = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/channels`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // kalau pakai JWT token:
          Authorization: user?.token ? `Bearer ${user.token}` : "",
        },
        body: JSON.stringify({
          name,
          description,
          isPrivate: false,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push(`/chat/${data.channel._id}`);
      } else {
        setError(data.message || "Failed to create channel");
      }
    } catch (err) {
      setError("An error occurred while creating the channel");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="bg-card p-6 rounded-lg shadow-xl w-full max-w-md text-foreground">
          <h2 className="text-xl font-bold mb-4">Access Denied</h2>
          <p className="mb-4">You need to be logged in to create a channel.</p>
          <Link
            href="/login"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="bg-card border-b border-border p-4">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="text-xl font-bold">
            Teleboom
          </Link>
          <div className="flex items-center space-x-4">
            <span>Hello, {user.username}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center mb-6">
            <button
              onClick={handleCancel}
              className="mr-4 p-2 rounded-full hover:bg-muted transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </button>
            <h1 className="text-2xl font-bold">Create Public Channel</h1>
          </div>

          <div className="bg-card p-6 rounded-lg shadow-md">
            {error && (
              <div className="mb-4 p-3 bg-destructive/10 text-destructive-foreground rounded-md">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateChannel} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Channel Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-border bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g. general-chat"
                  required
                  maxLength={50}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {name.length}/50 characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-border bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Describe the purpose of this channel"
                  rows={3}
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {description.length}/200 characters
                </p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2 bg-muted text-foreground rounded-md hover:bg-muted/70 transition-colors"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {isLoading ? "Creating..." : "Create Channel"}
                </button>
              </div>
            </form>
          </div>

          <div className="mt-6 bg-card p-6 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold mb-3">About Public Channels</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-primary mr-2 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>Anyone can join public channels</span>
              </li>
              <li className="flex items-start">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-primary mr-2 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>Messages are visible to all members</span>
              </li>
              <li className="flex items-start">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-primary mr-2 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>You'll be the owner and can manage settings</span>
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
