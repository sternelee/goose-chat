import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

interface ServerStatus {
  Stopped?: null;
  Starting?: null;
  Running?: { base_url: string };
  Error?: { message: string };
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function App() {
  const [serverStatus, setServerStatus] = useState<ServerStatus>({ Stopped: null });
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Check server status on mount
  useEffect(() => {
    checkServerStatus();
  }, []);

  async function checkServerStatus() {
    try {
      const status = await invoke<ServerStatus>("get_server_status");
      setServerStatus(status);
    } catch (error) {
      console.error("Failed to get server status:", error);
    }
  }

  async function startServer() {
    try {
      await invoke("start_server", { workingDir: null });
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for server to start
      await checkServerStatus();
    } catch (error) {
      console.error("Failed to start server:", error);
      alert("Failed to start server: " + error);
    }
  }

  async function stopServer() {
    try {
      await invoke("stop_server");
      await checkServerStatus();
    } catch (error) {
      console.error("Failed to stop server:", error);
    }
  }

  async function sendMessage() {
    if (!inputValue.trim()) return;
    if (!('Running' in serverStatus)) {
      alert("Server is not running. Please start the server first.");
      return;
    }

    const userMessage: Message = { role: 'user', content: inputValue };
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // This is a simple example - you'd want to integrate with the actual goose-server API
      const response = await invoke<{ status: number; body: string }>("api_request", {
        request: {
          method: "GET",
          path: "/api/v1/status",
          body: null
        }
      });

      const assistantMessage: Message = {
        role: 'assistant',
        content: `Server response (${response.status}): ${response.body}`
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error: ${error}`
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }

  const getStatusDisplay = () => {
    if ('Stopped' in serverStatus) return 'Stopped';
    if ('Starting' in serverStatus) return 'Starting...';
    if ('Running' in serverStatus) return `Running at ${serverStatus.Running?.base_url}`;
    if ('Error' in serverStatus) return `Error: ${serverStatus.Error?.message}`;
    return 'Unknown';
  };

  const isRunning = 'Running' in serverStatus;

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Goose Chat</h1>
        <div className="server-controls">
          <div className="status-indicator">
            Status: <span className={isRunning ? 'status-running' : 'status-stopped'}>
              {getStatusDisplay()}
            </span>
          </div>
          <button onClick={startServer} disabled={isRunning}>
            Start Server
          </button>
          <button onClick={stopServer} disabled={!isRunning}>
            Stop Server
          </button>
          <button onClick={checkServerStatus}>
            Refresh Status
          </button>
        </div>
      </header>

      <main className="chat-container">
        <div className="messages-area">
          {messages.length === 0 ? (
            <div className="welcome-message">
              <h2>Welcome to Goose Chat</h2>
              <p>Start chatting with your AI assistant</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`message message-${msg.role}`}>
                <div className="message-role">{msg.role === 'user' ? 'You' : 'Goose'}</div>
                <div className="message-content">{msg.content}</div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="message message-assistant">
              <div className="message-role">Goose</div>
              <div className="message-content">Thinking...</div>
            </div>
          )}
        </div>

        <div className="input-area">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                sendMessage();
              }
            }}
            placeholder={isRunning ? "Type a message..." : "Start the server first..."}
            disabled={!isRunning || isLoading}
            className="message-input"
          />
          <button
            onClick={sendMessage}
            disabled={!isRunning || isLoading || !inputValue.trim()}
            className="send-button"
          >
            Send
          </button>
        </div>
      </main>
    </div>
  );
}

export default App;
