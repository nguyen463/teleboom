
"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export default function ProfilePage() {
  const [formData, setFormData] = useState({ displayName: "", email: "" });
  const [avatarFile, setAvatarFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user) {
      setFormData({ displayName: user.displayName, email: user.email });
      setPreview(user.avatarUrl || "");
    }
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setPreview(URL.createObjectURL(file)); // preview image
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user"));

      const data = new FormData();
      data.append("displayName", formData.displayName);
      data.append("email", formData.email);
      if (avatarFile) data.append("avatar", avatarFile);

      const res = await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/users/${user.id}`,
        data,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } }
      );

      toast.success("✅ Profile updated!");
      localStorage.setItem("user", JSON.stringify(res.data.user));
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded shadow space-y-4">
      <h1 className="text-xl font-bold">Update Profile</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          name="displayName"
          placeholder="Display Name"
          value={formData.displayName}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded"
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded"
        />
        <div className="flex items-center space-x-4">
          <img
            src={preview || "/default-avatar.png"}
            alt="Avatar Preview"
            className="w-16 h-16 rounded-full border"
          />
          <input type="file" accept="image/*" onChange={handleFileChange} />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {loading ? "Updating..." : "Update Profile"}
        </button>
      </form>
    </div>
  );
}
