const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const Message = require("./models/Message"); // Pastikan model Message sudah ada

const app = express();
const server = http.createServer(app);

// ====== KONFIGURASI SOCKET.IO ======
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Ganti nanti dengan domain frontend kamu
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

// ====== MIDDLEWARE ======
app.use(express.json());
app.use(cors());

// ====== EVENT SOCKET.IO ======
io.on("connection", async (socket) => {
  console.log("🔗 Pengguna terhubung:", socket.id);

  // Kirim semua pesan ke client saat baru konek
  const allMessages = await Message.find().sort({ createdAt: 1 });
  socket.emit("load_messages", allMessages);

  // Kirim pesan baru
  socket.on("chat_message", async (data) => {
    const newMessage = new Message({
      text: data.text,
      senderId: socket.id,
    });
    await newMessage.save();

    io.emit("receive_message", newMessage);
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
    await Message.findByIdAndDelete(id);
    io.emit("message_deleted", id);
  });

  socket.on("disconnect", () => {
    console.log("❌ Pengguna terputus:", socket.id);
  });
});

// ====== KONEKSI MONGODB ATLAS ======
const MONGO_URI =
  process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ Terhubung ke MongoDB Atlas"))
  .catch((err) => console.error("❌ Gagal terhubung ke MongoDB:", err));

// ====== JALANKAN SERVER ======
const PORT = process.env.PORT || 3001;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server berjalan di http://0.0.0.0:${PORT}`);
});

