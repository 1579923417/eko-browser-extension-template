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
    }
  } catch (e) {
    handleError(e);
  } finally {
    chrome.storage.local.set({ running: false, canceling: false });
    chrome.runtime.sendMessage({ type: "stop" });
  }
});