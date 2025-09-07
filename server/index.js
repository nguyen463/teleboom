const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const morgan = require("morgan");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");

// Model & Routes
const Message = require("./models/Message");
const authRoutes = require("./routes/authRoutes");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// ====== ENV VALIDATION ======
if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI is required");
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error("❌ JWT_SECRET is required");
  process.exit(1);
}

// ====== MIDDLEWARE ======
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json({ limit: '10mb' }));

// ====== CORS ======
app.use(
  cors({
    origin: true, //process.env.FRONTEND_URL || "https://teleboom.vercel.app",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// ====== RATE LIMITING ======
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many attempts, please try again later'
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ====== CONNECT MONGODB ======
mongoose.set("strictQuery", true);
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Terhubung ke MongoDB Atlas"))
  .catch((err) => {
    console.error("❌ Gagal terhubung ke MongoDB:", err.message);
    process.exit(1);
  });

// ====== ROUTES ======
app.use("/api/auth", authRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'Teleboom Backend API',
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// ====== SOCKET.IO ======
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "https://teleboom.vercel.app",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Socket.io authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Authentication required"));
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error("Invalid token"));
  }
});

io.on("connection", async (socket) => {
  console.log(`🔗 User connected: ${socket.id}, UserId: ${socket.userId}`);

  try {
    const allMessages = await Message.find().sort({ createdAt: 1 });
    socket.emit("load_messages", allMessages);
  } catch (err) {
    console.error("❌ Failed to load messages:", err.message);
    socket.emit("error", "Failed to load messages");
  }

  socket.on("chat_message", async (data) => {
    try {
      if (!data.text || data.text.trim() === '') return;
      
      const newMessage = new Message({ 
        text: data.text.trim(),
        senderId: socket.userId,
        senderName: data.senderName || "Anonymous"
      });
      
      await newMessage.save();
      io.emit("receive_message", newMessage);
      
    } catch (err) {
      console.error("❌ Error sending message:", err);
      socket.emit("error", "Failed to send message");
    }
  });

  // [Tambahkan edit_message dan delete_message handlers...]

  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${socket.id}`);
  });
});

// ====== START SERVER ======
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    mongoose.connection.close();
    process.exit(0);
  });
});
