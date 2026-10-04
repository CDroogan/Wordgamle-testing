import React, { useRef, useEffect, useState  } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);
import EmojiPicker from "emoji-picker-react";
import { FaRegSmile } from "react-icons/fa";
import axios from "axios";
import MemberProfile from "../../constant/Models/MemberProfile";

function GroupChatMessagesByDate({ gameName, messages, userId, baseURL, highlightMsgId, generalChat, onMessagesChanged }) {
  const [showPickerFor, setShowPickerFor] = useState(null);
  const [expandedReaction, setExpandedReaction] = useState(null); // `${messageId}-${emoji}`
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
      setShowPickerFor(null);
    } catch (error) {
      alert("Failed to send reaction. Please try again.");
    }
  };

  // Groups a message's individual reactions (one per person) into
  // per-emoji counts, e.g. [{ emoji: '🔥', count: 2, users: [...] }].
  const groupReactions = (reactions) => {
    if (!reactions || reactions.length === 0) return [];
    const byEmoji = {};
    reactions.forEach((r) => {
      if (!byEmoji[r.emoji]) byEmoji[r.emoji] = [];
      byEmoji[r.emoji].push(r);
    });
    return Object.entries(byEmoji).map(([emoji, users]) => ({ emoji, count: users.length, users }));
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
                    {/* 💖 Reactions (bottom-left corner like WhatsApp) - one
                        pill per distinct emoji, with a count; tap a pill to
                        see who left it. */}
                    {groupReactions(msg.reactions).length > 0 && (
                      <div
                        style={{
                          position: "absolute",
                          bottom: "-14px",
                          left: "0px",
                          display: "flex",
                          gap: "3px",
                        }}
                      >
                        {groupReactions(msg.reactions).map(({ emoji, count, users }) => {
                          const key = `${msg.id}-${emoji}`;
                          return (
                            <div key={key} style={{ position: "relative" }}>
                              <div
                                onClick={() => setExpandedReaction(expandedReaction === key ? null : key)}
                                style={{
                                  background: "#ffffff",
                                  border: "1px solid #ddd",
                                  borderRadius: "10px",
                                  padding: "1px 5px",
                                  fontSize: "0.8rem",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px",
                                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                                  cursor: "pointer",
                                }}
                              >
                                {emoji}{count > 1 && <span style={{ fontSize: "0.65rem", color: "#555" }}>{count}</span>}
                              </div>
                              {expandedReaction === key && (
                                <div
                                  style={{
                                    position: "absolute",
                                    top: "100%",
                                    left: 0,
                                    marginTop: "4px",
                                    background: "#fff",
                                    border: "1px solid #ddd",
                                    borderRadius: "8px",
                                    padding: "6px 10px",
                                    fontSize: "0.75rem",
                                    whiteSpace: "nowrap",
                                    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                                    zIndex: 10,
                                  }}
                                >
                                  {users.map((u) => u.username).join(", ")}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {/* Add Reaction button and Emoji Picker — only show for others' messages */}
                  {!isMe && (
                    <div>
                      <button
                        className="btn btn-sm text-muted p-0 mt-1"
                        onClick={() =>
                          setShowPickerFor(showPickerFor === msg.id ? null : msg.id)
                        }
                      >
                        <FaRegSmile size={16} />
                      </button>
                      {showPickerFor === msg.id && (
                        <div
                          style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            backgroundColor: "rgba(0,0,0,0.5)",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            zIndex: 9999,
                          }}
                          onClick={() => setShowPickerFor(null)} // Close on background tap
                        >
                          <div
                            onClick={(e) => e.stopPropagation()} // Prevent background close
                            style={{
                              background: "#fff",
                              borderRadius: "12px",
                              padding: "15px",
                              width: "90%",
                              maxWidth: "350px",
                              boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
                            }}
                          >
                            <EmojiPicker
                              onEmojiClick={(emojiData) => handleEmojiSelect(emojiData, msg.id)}
                              autoFocusSearch={false}
                            />
                          </div>
                        </div>
                      )}

                    </div>
                  )}
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
