import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Row, Col } from "react-bootstrap";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import GroupChatMessagesByDate from "./GroupChatMessagesByDate";
import GroupChatInput from "./GroupChatInput";

function GroupGameChat({ groupId, gameName, createdAt, periodType, userId, highlightMsgId, generalChat, userTimezone, chatBoxHeight = "350px" }) {
  const baseURL = import.meta.env.VITE_BASE_URL;
  const [messages, setMessages] = useState([]);
  const chatBoxRef = useRef(null);

  // Keep the chat scrolled to its latest message - scrolling only within
  // this box (not scrollIntoView, which would also drag the whole page
  // down to bring the box into view on pages with content below it).
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  // Fetch messages
  const fetchMessages = async () => {
    
   const created_at = dayjs(createdAt, "YYYY-MM-DD HH:mm:ss").format("YYYY-MM-DD");
    try {
      const baseParams = { group_id: groupId, game_name: gameName, created_at, userTimezone };
      const params = gameName === "phrazle" ? { ...baseParams, period: periodType } : baseParams;

      const response = await axios.get(
        `${baseURL}/groups/get-user-messages.php`,
        { params }
      );
      setMessages(response.data);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  };

  useEffect(() => {
    if (groupId && gameName) {
      fetchMessages();
    }
  }, [groupId, gameName]);

  // Fetch messages
  const fetchGeneralMessages = async () => {
   const created_at = dayjs().format("YYYY-MM-DD");
    try {
      const baseParams = { group_id: groupId, game_name: gameName, created_at, general_chat: generalChat, userTimezone };
      const params = gameName === "phrazle" ? { ...baseParams, period: periodType } : baseParams;

      const response = await axios.get(
        `${baseURL}/groups/get-user-messages.php`,
        { params }
      );
      setMessages(response.data);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  };

  useEffect(() => {
    if (groupId && generalChat) {
      fetchGeneralMessages();
    }
  }, [groupId, generalChat]);

  // Send message
  const handleSend = async (messageText) => {
    // For general chat the backend always stamps its own true UTC time,
    // ignoring this value - only per-game chat's day-bucket matching
    // still relies on it.
    await axios.post(`${baseURL}/groups/send-user-message.php`, {
      group_id: groupId,
      game_name: gameName,
      created_at: createdAt,
      user_id: userId,
      message: messageText,
      general_chat: generalChat
    });

    if (generalChat) {
      fetchGeneralMessages();
    } else {
      fetchMessages();
    }
  };

  return (
        <>
        {/* Input box - kept above the scrollable message list so it's
            always visible without scrolling down to find it. */}
        <GroupChatInput onSend={handleSend} gameName={gameName} />

        <div
          ref={chatBoxRef}
          className="chat-box border rounded p-3 mt-2"
          style={{ height: chatBoxHeight, overflowY: "auto", background: "#e8f3fb" }}
        >
          <GroupChatMessagesByDate
            gameName={gameName}
            messages={messages}
            userId={userId}
            baseURL={baseURL}
            highlightMsgId={highlightMsgId}
            generalChat={generalChat}
            onMessagesChanged={generalChat ? fetchGeneralMessages : fetchMessages}
          />
        </div>
        </>
  );
}

export default GroupGameChat;
