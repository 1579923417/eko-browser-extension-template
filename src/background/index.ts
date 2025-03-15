import Eko from "@eko-ai/eko";
import { loadTools } from "@eko-ai/eko/extension";
import { main, cancelWorkflow } from "./first_workflow";
import { ca } from "element-plus/es/locales.mjs";

chrome.storage.local.set({ running: false, canceling: false });

//Register tools
Eko.tools = loadTools();

//Helper function to handle errors and send log messages
const handleError = (e: any) => {
  console.error(e);
  chrome.runtime.sendMessage({ 
    type: "log",
    log: e.message, 
    level: "error" 
  });
};

//Listen for messages from the browser extension
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  try {
    if (request.type === "run"){
      chrome.runtime.sendMessage({ type: "log", log: "Run..." });
      // Run workflow
      await main(request.prompt);
    } else if (request.type === "cancel") { 
      chrome.runtime.sendMessage({ type: "log", log: "Cancel..." });
      // Cancel workflow
      await cancelWorkflow();
    } else if (request.type === "humanInputText") {
      // 处理人机交互的文本输入消息
      const answer = prompt(request.question);
      sendResponse({ answer });
    } else if (request.type === "humanInputSingleChoice") {
      // 处理人机交互的单选消息
      const answer = prompt(`${request.question}\nChoices: ${request.choices.join(", ")}`);
      sendResponse({ answer });
    } else if (request.type === "humanInputMultipleChoice") {
      // 处理人机交互的多选消息
      const answer = prompt(`${request.question}\nChoices: ${request.choices.join(", ")}`);
      sendResponse({ answer: answer.split(",") });
    } else if (request.type === "humanOperate") {
      // 处理人机交互的操作消息
      const userOperation = prompt(request.reason);
      sendResponse({ userOperation });
    }
  } catch (e) {
    handleError(e);
  } finally {
    chrome.storage.local.set({ running: false, canceling: false });
    chrome.runtime.sendMessage({ type: "stop" });
  }
});