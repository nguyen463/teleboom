// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const Message = require("./models/Message"); // Pastikan model Message sudah ada

// ====== INISIALISASI ======
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

app.use("/api/auth", authRoutes);

// ====== MIDDLEWARE ======
app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000", // ganti sesuai frontend
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// ====== KONEKSI MONGODB ======
const MONGO_URI = process.env.MONGO_URI;
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ Terhubung ke MongoDB Atlas"))
  .catch((err) => console.error("❌ Gagal terhubung ke MongoDB:", err));

// ====== KONFIGURASI SOCKET.IO ======
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

// ====== EVENT SOCKET.IO ======
io.on("connection", async (socket) => {
  console.log("🔗 Pengguna terhubung:", socket.id);

  // Kirim semua pesan saat koneksi baru
  try {
    const allMessages = await Message.find().sort({ createdAt: 1 });
    socket.emit("load_messages", allMessages);
  } catch (err) {
    console.error("❌ Gagal load messages:", err);
  }

  // Kirim pesan baru
  socket.on("chat_message", async (data) => {
    try {
      const newMessage = new Message({
        text: data.text,
        senderId: socket.id,
      });
      await newMessage.save();
      io.emit("receive_message", newMessage);
    } catch (err) {
      console.error("❌ Gagal kirim pesan:", err);
    }
  });

  // Edit pesan
  socket.on("edit_message", async ({ id, newText }) => {
    try {
      const updatedMessage = await Message.findByIdAndUpdate(
        id,
        { text: newText },
        { new: true }
      );
      io.emit("message_updated", updatedMessage);
    } catch (err) {
      console.error("❌ Gagal update pesan:", err);
    }
  });

  // Hapus pesan
  socket.on("delete_message", async (id) => {
    try {
      await Message.findByIdAndDelete(id);
      io.emit("message_deleted", id);
    } catch (err) {
      console.error("❌ Gagal hapus pesan:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ Pengguna terputus:", socket.id);
  });
});

// ====== JALANKAN SERVER ======
server.listen(PORT, () => {
  console.log(`🚀 Server berjalan di port ${PORT}`);
});
