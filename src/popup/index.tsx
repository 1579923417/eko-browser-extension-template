import { createRoot } from "react-dom/client";
import React, { useState, useRef, useEffect } from "react";
import { Button, Input, Modal, Select } from "antd";

interface LogMessage {
  time: string;
  log: string;
  level?: "info" | "error" | "success";
}

const AppRun = () => {
  const [running, setRunning] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const logsRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [prompt, setPrompt] = useState(
    "Search Sam Altman's information and summarize it into markdown format for export"
  );

  const [modalVisible, setModalVisible] = useState(false);
  const [modalQuestion, setModalQuestion] = useState("");
  const [modalChoices, setModalChoices] = useState<string[]>([]);
  const [modalType, setModalType] = useState<"text" | "single" | "multiple" | "operate">("text");
  const [modalCallback, setModalCallback] = useState<(response: any) => void>(() => {});

  useEffect(() => {
    chrome.storage.local.get(["running", "prompt", "canceling"], (result) => {
      if (result.running !== undefined) {
        setRunning(result.running);
      }
      if (result.prompt !== undefined) {
        setPrompt(result.prompt);
      }
      if (result.canceling !== undefined) {
        setCanceling(result.canceling);
      }
    });

    const messageListener = (message: any, sender: any, sendResponse: any) => {
      if (message.type === "stop") {
        setRunning(false);
        setCanceling(false);
        chrome.storage.local.set({ running: false });
      } else if (message.type === "log") {
        const time = new Date().toLocaleTimeString();
        setLogs((prev) => [
          ...prev,
          { time, log: message.log, level: message.level || "info" },
        ]);
      } else if (message.type === "humanInputText") {
        setModalQuestion(message.question);
        setModalType("text");
        setModalCallback(() => (response: any) => sendResponse({ answer: response }));
        setModalVisible(true);
      } else if (message.type === "humanInputSingleChoice") {
        setModalQuestion(message.question);
        setModalChoices(message.choices);
        setModalType("single");
        setModalCallback(() => (response: any) => sendResponse({ answer: response }));
        setModalVisible(true);
      } else if (message.type === "humanInputMultipleChoice") {
        setModalQuestion(message.question);
        setModalChoices(message.choices);
        setModalType("multiple");
        setModalCallback(() => (response: any) => sendResponse({ answer: response }));
        setModalVisible(true);
      } else if (message.type === "humanOperate") {
        setModalQuestion(message.reason);
        setModalType("operate");
        setModalCallback(() => (response: any) => sendResponse({ userOperation: response }));
        setModalVisible(true);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);

    // 添加示例对话框的触发逻辑
    useEffect(() => {
      // 示例：显示文本输入对话框
      setModalQuestion("Please enter some text:");
      setModalType("text");
      setModalCallback((response: any) => console.log("User input:", response));
      setModalVisible(true);
  
      // // 示例：显示单选对话框
      // setModalQuestion("Please select an option:");
      // setModalChoices(["Option 1", "Option 2", "Option 3"]);
      // setModalType("single");
      // setModalCallback((response: any) => console.log("User selected:", response));
      // setModalVisible(true);
  
      // // 示例：显示多选对话框
      // setModalQuestion("Please select multiple options:");
      // setModalChoices(["Option 1", "Option 2", "Option 3"]);
      // setModalType("multiple");
      // setModalCallback((response: any) => console.log("User selected:", response));
      // setModalVisible(true);
  
      // // 示例：显示操作对话框
      // setModalQuestion("Please describe the operation:");
      // setModalType("operate");
      // setModalCallback((response: any) => console.log("User operation:", response));
      // setModalVisible(true);
    }, []);

  const handleClick = () => {
    if (!prompt.trim()) {
      return;
    }
    setLogs([]);
    setRunning(true);
    setCanceling(false);
    chrome.storage.local.set({ running: true, prompt });
    chrome.runtime.sendMessage({ type: "run", prompt: prompt.trim() });
  };

  const handleCancel = () => {
    setCanceling(true);
    chrome.storage.local.set({ canceling: true, prompt });
    chrome.runtime.sendMessage({ type: "cancel" });
  };

  const handleModalOk = (response: any) => {
    setModalVisible(false);
    modalCallback(response);
  };

  const getLogStyle = (level: string) => {
    switch (level) {
      case "error":
        return { color: "#ff4d4f" };
      case "success":
        return { color: "#52c41a" };
      default:
        return { color: "#1890ff" };
    }
  };

  const [inputValue, setInputValue] = useState<string>("");
  const [selectedChoices, setSelectedChoices] = useState<string[]>([]);

  return (
    <div
      style={{
        minWidth: "360px",
        minHeight: "420px",
      }}
    >
      <div
        style={{
          textAlign: "center",
        }}
      >
        <h3>Eko Workflow</h3>
        <Input.TextArea
          ref={textAreaRef}
          rows={4}
          value={prompt}
          disabled={running}
          placeholder="Your workflow"
          onChange={(e) => setPrompt(e.target.value)}
        />
        <Button
          type="primary"
          onClick={handleClick}
          disabled={running}
          style={{
            marginTop: "4px",
          }}
        >
          {running ? "Running..." : "Run"}
        </Button>
        
        <Button
          type="primary"
          onClick={handleCancel}
          disabled={canceling || !running}
          style={{
            marginTop: "4px",
            left: "10px",
            backgroundColor: canceling ? "#ffcccc" : "#ff4d4f",
            borderColor: canceling ? "#ffcccc" : "#ff4d4f",
            color: canceling ? "#555555" : "#fff" 
          }}
        >
          {canceling ? "Canceling..." : "Cancel"}
        </Button>
        
      </div>
      {logs.length > 0 && (
        <div
          ref={logsRef}
          style={{
            marginTop: "16px",
            textAlign: "left",
            border: "1px solid #d9d9d9",
            borderRadius: "4px",
            padding: "8px",
            width: "360px",
            height: "220px",
            overflowY: "auto",
            backgroundColor: "#f5f5f5",
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: "8px" }}>Logs:</div>
          {logs.map((log, index) => (
            <div
              key={index}
              style={{
                fontSize: "12px",
                marginBottom: "4px",
                fontFamily: "monospace",
                ...getLogStyle(log.level || "info"),
              }}
            >
              [{log.time}] {log.log}
            </div>
          ))}
        </div>
      )}

      <Modal
        title="User Input Required"
        visible={modalVisible}
        onOk={() => handleModalOk(modalType === "multiple" ? selectedChoices : inputValue)}
        onCancel={() => setModalVisible(false)}
      >
        {modalType === "text" && (
          <Input
            placeholder={modalQuestion}
            onChange={(e) => setInputValue(e.target.value)}
          />
        )}
        {modalType === "single" && (
          <Select
            placeholder={modalQuestion}
            onChange={(value) => setInputValue(value)}
          >
            {modalChoices.map((choice) => (
              <Select.Option key={choice} value={choice}>
                {choice}
              </Select.Option>
            ))}
          </Select>
        )}
        {modalType === "multiple" && (
          <Select
            mode="multiple"
            placeholder={modalQuestion}
            onChange={(value) => setSelectedChoices(value)}
          >
            {modalChoices.map((choice) => (
              <Select.Option key={choice} value={choice}>
                {choice}
              </Select.Option>
            ))}
          </Select>
        )}
        {modalType === "operate" && (
          <Input
            placeholder={modalQuestion}
            onChange={(e) => setInputValue(e.target.value)}
          />
        )}
      </Modal>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);

root.render(
  <React.StrictMode>
    <AppRun />
  </React.StrictMode>
);