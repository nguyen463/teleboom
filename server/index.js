// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const morgan = require("morgan"); // Tambahkan untuk logging
const path = require("path"); // Tambahkan untuk path
const Message = require("./models/Message"); // Pastikan model Message sudah ada

// Jika Anda memiliki authRoutes, pastikan di-import
// const authRoutes = require("./routes/authRoutes"); 

// ====== INI HALAMAN UTAMA BACKEND-MU ======
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// ====== MIDDLEWARE ======
// Logging HTTP requests
app.use(morgan("dev")); 

// Mengizinkan parsing JSON dari body request
app.use(express.json());

// Mengatur CORS untuk HTTP
app.use(
  cors({
    origin: "https://teleboom.vercel.app",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// Serve file statis dari direktori frontend (jika ada)
// app.use(express.static(path.join(__dirname, 'frontend/build')));

// ====== PENANGANAN KESALAHAN PADA RUTE (ROUTE-NOT-FOUND) ======
// app.use((req, res, next) => {
//     res.status(404).json({ error: 'Rute tidak ditemukan' });
// });

// ====== KONEKSI KE MONGODB ======
const MONGO_URI = process.env.MONGO_URI;

mongoose.set('strictQuery', true); // Direkomendasikan oleh Mongoose

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ Terhubung ke MongoDB Atlas dengan sukses");
  })
  .catch((err) => {
    console.error("❌ Gagal terhubung ke MongoDB Atlas:", err.message);
    process.exit(1); // Menghentikan aplikasi jika koneksi gagal
  });

// ====== RUTE API (INI TEMPAT UNTUK MENAMBAHKAN RUTE LAIN) ======
// app.use("/api/auth", authRoutes); // Gunakan rute yang sudah diimpor

app.get('/', (req, res) => {
  res.send('Server berjalan dengan baik!');
});

// ====== KONFIGURASI SOCKET.IO ======
const io = new Server(server, {
  cors: {
    origin: "https://teleboom.vercel.app",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

// ====== EVENT SOCKET.IO ======
io.on("connection", async (socket) => {
  console.log(`🔗 Pengguna terhubung: ${socket.id}`);

  // Kirim semua pesan saat koneksi baru
  try {
    const allMessages = await Message.find().sort({ createdAt: 1 });
    socket.emit("load_messages", allMessages);
  } catch (err) {
    console.error("❌ Gagal load messages:", err.message);
  }

  // Kirim pesan baru
  socket.on("chat_message", async (data) => {
    try {
      if (!data.text) {
        return console.error("Pesan kosong diterima");
      }
      const newMessage = new Message({
        text: data.text,
        senderId: socket.id,
      });
      await newMessage.save();
      // Mengirim pesan ke semua klien, termasuk pengirim
      io.emit("receive_message", newMessage);
    } catch (err) {
      console.error("❌ Gagal kirim pesan:", err.message);
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
      if (updatedMessage) {
        io.emit("message_updated", updatedMessage);
      } else {
        console.warn(`Pesan dengan ID ${id} tidak ditemukan.`);
      }
    } catch (err) {
      console.error("❌ Gagal update pesan:", err.message);
    }
  });

  // Hapus pesan
  socket.on("delete_message", async (id) => {
    try {
      const deletedMessage = await Message.findByIdAndDelete(id);
      if (deletedMessage) {
        io.emit("message_deleted", id);
      } else {
        console.warn(`Pesan dengan ID ${id} tidak ditemukan.`);
      }
    } catch (err) {
      console.error("❌ Gagal hapus pesan:", err.message);
    }
  });

  socket.on("disconnect", () => {
    console.log(`❌ Pengguna terputus: ${socket.id}`);
  });
});

// ====== JALANKAN SERVER ======
server.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});
