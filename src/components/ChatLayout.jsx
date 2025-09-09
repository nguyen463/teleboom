import React, { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, Image, SafeAreaView, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { io } from "socket.io-client";
import * as ImagePicker from 'expo-image-picker';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import { getAuthToken, logout } from "./auth";

const SOCKET_URL = "http://localhost:5000";

export default function ChatScreen({ navigation, user }) {
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);

  const socketRef = useRef(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    // 🔹 Sambungkan ke Socket.IO
    const token = getAuthToken();
    socketRef.current = io(SOCKET_URL, { auth: { token } });

    socketRef.current.on("connect", () => console.log("✅ Connected to socket server"));
    socketRef.current.on("initialMessages", (msgs) => setMessages(msgs));
    socketRef.current.on("message", (msg) => {
      setMessages((prev) => [...prev, msg]);
      flatListRef.current?.scrollToEnd({ animated: true });
    });
    socketRef.current.on("onlineUsers", (users) => setOnlineUsers(users));
    socketRef.current.on("typing", (users) => setTypingUsers(users));

    return () => socketRef.current.disconnect();
  }, []);

  // 🔹 Kirim pesan teks
  const sendTextMessage = () => {
    if (!newMsg.trim()) return;
    const msg = { text: newMsg, userId: user.id, username: user.name, timestamp: Date.now() };
    socketRef.current.emit("sendMessage", msg);
    setNewMsg("");
  };

  // 🔹 Kirim gambar
  const sendImageMessage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      const msg = { type: "image", uri, userId: user.id, username: user.name, timestamp: Date.now() };
      socketRef.current.emit("sendImage", msg);
    }
  };

  // 🔹 Indikator mengetik
  const handleTyping = (text) => {
    setNewMsg(text);
    if (text) socketRef.current.emit("typing", user.name);
    else socketRef.current.emit("stopTyping", user.name);
  };

  // 🔹 Render item pesan
  const renderMessage = ({ item }) => {
    const isOwn = item.userId === user.id;
    return (
      <View style={[styles.messageBubble, isOwn ? styles.myBubble : styles.otherBubble]}>
        <Text style={styles.username}>{item.username}</Text>
        {item.type === "image" ? (
          <Image source={{ uri: item.uri }} style={styles.imageMessage} />
        ) : (
          <Text style={isOwn ? styles.myText : styles.otherText}>{item.text}</Text>
        )}
        <Text style={styles.timestamp}>{new Date(item.timestamp).toLocaleTimeString()}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chat Room</Text>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.timestamp.toString()}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        style={styles.messagesContainer}
      />
      {typingUsers.length > 0 && (
        <View style={styles.typingContainer}>
          <Text style={styles.typingText}>{typingUsers.join(", ")} is typing...</Text>
        </View>
      )}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.inputContainerWrapper}
      >
        <View style={styles.inputContainer}>
          <TouchableOpacity onPress={sendImageMessage} style={styles.mediaButton}>
            <Ionicons name="image" size={24} color="#666" />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Tulis pesan..."
            value={newMsg}
            onChangeText={handleTyping}
            onSubmitEditing={sendTextMessage}
            multiline
          />
          <TouchableOpacity onPress={sendTextMessage} style={styles.sendButton}>
            <Ionicons name="send" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f0f0" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#007AFF",
    padding: 15,
    paddingTop: Platform.OS === 'android' ? 15 : 0,
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  logoutButton: { backgroundColor: "#FF3B30", padding: 8, borderRadius: 5 },
  logoutText: { color: "#fff" },
  messagesContainer: { paddingHorizontal: 10, paddingVertical: 5 },
  messageBubble: {
    maxWidth: "80%",
    padding: 10,
    borderRadius: 15,
    marginVertical: 5,
  },
  myBubble: {
    backgroundColor: "#007AFF",
    marginLeft: "auto",
    borderTopRightRadius: 0,
  },
  otherBubble: {
    backgroundColor: "#E5E5EA",
    marginRight: "auto",
    borderTopLeftRadius: 0,
  },
  username: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#666",
    marginBottom: 2,
  },
  myText: { color: "#fff" },
  otherText: { color: "#000" },
  imageMessage: { width: 200, height: 200, borderRadius: 10 },
  timestamp: { fontSize: 10, color: "#999", textAlign: "right", marginTop: 5 },
  typingContainer: { paddingHorizontal: 15, paddingVertical: 5 },
  typingText: { color: "#007AFF" },
  inputContainerWrapper: { paddingBottom: 15 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: "#ccc",
  },
  input: {
    flex: 1,
    maxHeight: 100,
    minHeight: 40,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingHorizontal: 15,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: "#007AFF",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  mediaButton: {
    marginRight: 10,
  }
});
