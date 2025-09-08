const response = await axios.post(
  `${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`,
  formData
);

const { token, user } = response.data;

// Simpan JWT
sessionStorage.setItem("chat-app-token", token);
sessionStorage.setItem("chat-user", JSON.stringify(user));

// Arahkan ke halaman chat
router.replace("/chat");
