import React, { useRef, useEffect, useState  } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);
import axios from "axios";
import MemberProfile from "../../constant/Models/MemberProfile";
import ReactionBar from "../../components/ReactionBar";

function GroupChatMessagesByDate({ gameName, messages, userId, baseURL, highlightMsgId, generalChat, onMessagesChanged }) {
  const [selectedMember, setSelectedMember] = useState(null);
  const [showProfile, setShowProfile] = useState(false);

  const handleShowProfile = (msg) => {
    setSelectedMember({
      username: msg.username,
      avatar: msg.avatar,
      first_name: msg.first_name,
      last_name: msg.last_name,
    });
    setShowProfile(true);
  };

  // Highlight specific message by ID
  useEffect(() => {
    if (highlightMsgId && messages.length > 0) {
      const el = document.getElementById(`msg-${highlightMsgId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("highlight");
        setTimeout(() => el.classList.remove("highlight"), 3000);
      }
    }
  }, [highlightMsgId, messages]);

  if (!messages || messages.length === 0) {
    return (
      <div className="text-center text-muted my-3">
        <p className="mb-0">No messages yet today.</p>
        <p>Type your message to the group below.</p>
      </div>
    );
  }

  // ✅ Group messages by date
  // const groupedMessages = messages.reduce((groups, msg) => {
  //   const dateKey = dayjs(msg.created_at).format("YYYY-MM-DD");
  //   if (!groups[dateKey]) groups[dateKey] = [];
  //   groups[dateKey].push(msg);
  //   return groups;
  // }, {});
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const groupedMessages = messages.reduce((acc, msg) => {
    // General chat timestamps are true UTC instants, so they convert
    // correctly to the viewer's own timezone. Per-game chat still stores
    // the sender's raw local clock time with no timezone attached, so
    // there's no zone to convert from - it's shown as recorded.
    const dateKey = generalChat
      ? dayjs.utc(msg.created_at).tz(userTimezone).format("YYYY-MM-DD")
      : dayjs(msg.created_at).format("YYYY-MM-DD");

    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }

    acc[dateKey].push(msg);

    return acc;
  }, {});

  // ✅ Helper to display human-friendly date (Today, Yesterday, etc.)
  const getDateLabel = (dateKey) => {
    const date = dayjs(dateKey);
    if (date.isSame(dayjs(), "day")) return "Today";
    if (date.isSame(dayjs().subtract(1, "day"), "day")) return "Yesterday";
    return date.format("MMM D, YYYY");
  };

  // ✅ Handle emoji reaction - each Gamler's own reaction is tracked
  // separately server-side, so after it saves we just refetch to pick up
  // everyone's current reactions (including this one).
  const handleEmojiSelect = async (emojiData, messageId) => {
    try {
      const response = await axios.post(`${baseURL}/groups/react-message.php`, {
        message_id: messageId,
        user_id: userId,
        emoji: emojiData.emoji,
        generalChat
      });

      if (response.data.success) {
        if (onMessagesChanged) onMessagesChanged();
      } else {
        alert("Something went wrong while reacting!");
      }
    } catch (error) {
      alert("Failed to send reaction. Please try again.");
    }
  };

  return (
    <>
      {Object.keys(groupedMessages).map((dateKey) => (
        <div key={dateKey}>

          {!gameName && (
            <div className="d-flex align-items-center my-3">
              <div style={{ flex: 1, height: "1px", backgroundColor: "#ccc" }}></div>
              <span
                style={{
                  background: "#e5e5e5",
                  padding: "3px 10px",
                  borderRadius: "10px",
                  fontSize: "0.75rem",
                  color: "#555",
                  margin: "0 10px",
                  whiteSpace: "nowrap",
                }}
              >
                {getDateLabel(dateKey)}
              </span>
              <div style={{ flex: 1, height: "1px", backgroundColor: "#ccc" }}></div>
            </div>
          )}

          {/* Messages for this date */}
          {groupedMessages[dateKey].map((msg) => {
            const isMe = msg.user_id === userId;
            const formattedTime = msg.created_at
              ? (generalChat
                  ? dayjs.utc(msg.created_at).tz(userTimezone).format("h:mm A")
                  : dayjs(msg.created_at).format("h:mm A"))
              : "";
            return (
              <div
                key={msg.id}
                id={`msg-${msg.id}`} // for highlight
                className="d-flex flex-column mb-3 align-items-start"
              >
                {/* Username */}
                <div
                  className="small fw-bold mb-1 ms-1 text-primary"
                  onClick={() => handleShowProfile(msg)}
                  style={{ cursor: "pointer" }}
                >
                  {msg.username || `User ${msg.user_id}`}
                </div>

                {/* Message row */}

                <div className={`d-flex align-items-end`} style={{ position: "relative", width: "100%" }}>
                  {/* Avatar + Reactions */}
                  <div style={{ position: "relative" }}>
                    <img
                      src={msg.avatar ? `${baseURL}/user/uploads/${msg.avatar}` : "https://via.placeholder.com/30"}
                      alt="avatar"
                      className="rounded-circle me-2"
                      width="30"
                      height="30"
                      onError={(e) => (e.target.style.display = "none")}
                      onClick={() => handleShowProfile(msg)}
                      style={{ cursor: "pointer", border: "2px solid #0d6efd" }}
                    />

                  </div>

                  {/* Message bubble */}
                  <div
                    className="p-2 rounded-3 bg-white border text-dark"
                    style={{
                      wordWrap: "break-word",
                      overflowWrap: "break-word",
                      whiteSpace: "pre-wrap",
                      position: "relative",
                      maxWidth: "90%",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ paddingRight: "40px", marginBottom: "5px"}}>{msg.message}</div>
                    <div
                      style={{
                        position: "absolute",
                        bottom: "3px",
                        right: "5px",
                        fontSize: "0.6rem",
                        color: "#6c757d",
                      }}
                    >
                      
                      {formattedTime}
                    </div>
                    {/* 💖 Reactions (bottom-left corner like WhatsApp) -
                        shared ReactionBar, same feature as the GameFeed. */}
                    <div style={{ position: "absolute", bottom: "-14px", left: "0px" }}>
                      <ReactionBar
                        reactions={msg.reactions}
                        reactionIdPrefix={msg.id}
                        canAddReaction={!isMe}
                        onReact={(emoji) => handleEmojiSelect({ emoji }, msg.id)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      <MemberProfile
        show={showProfile}
        onHide={() => setShowProfile(false)}
        selectedMember={selectedMember}
        baseURL={baseURL}
      />
    </>
  );
}

export default GroupChatMessagesByDate;
