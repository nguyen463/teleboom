
// pages/channels/[id].js
import { useRouter } from "next/router";
import { useMemo, useEffect } from "react";
import ChatLayout from "../../src/components/ChatLayout";
import axios from "axios";

export default function ChannelPage() {
  const router = useRouter();
  const { id } = router.query;
  const rawUser = JSON.parse(localStorage.getItem("chat-app-user") || "{}");

  const user = useMemo(
    () => ({
      id: rawUser.id,
      username: rawUser.username,
      displayName: rawUser.displayName,
      token: localStorage.getItem("chat-app-token"),
    }),
    [rawUser.id, rawUser.username, rawUser.displayName]
  );

  // Validasi channelId
  useEffect(() => {
    if (!id || !user?.token) {
      router.push("/login");
      return;
    }

    const validateChannel = async () => {
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/channels`,
          {
            headers: { Authorization: `Bearer ${user.token}` },
          }
        );
        const validChannel = response.data.find(
          (channel) => channel._id === id
        );
        if (!validChannel) {
          router.push("/channels");
        }
      } catch (error) {
        router.push("/login");
      }
    };
    validateChannel();
  }, [id, user, router]);

  if (!id || !user?.token) {
    return null;
  }

  return <ChatLayout user={user} channelId={id} />;
}
