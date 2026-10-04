import React, { useState } from "react";
import { InputGroup, Form, Button } from "react-bootstrap";
import { FaPaperPlane } from "react-icons/fa";
import MentionTextarea from "../../components/MentionTextarea";

function GroupChatInput({ onSend, gameName, baseURL }) {
  const [text, setText] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text); // send message back to parent
    setText("");
  };

  return (
    <Form onSubmit={handleSubmit}>
      <InputGroup>
        <MentionTextarea
          minRows={1}
          maxRows={4}
          value={text}
          onChange={setText}
          placeholder="Type a message..."
          baseURL={baseURL}
        />
        <Button className={`${gameName}-btn`} type="submit">
          <FaPaperPlane />
        </Button>
      </InputGroup>
    </Form>
  );
}

export default GroupChatInput;
