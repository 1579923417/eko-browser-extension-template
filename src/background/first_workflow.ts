import { Eko, createChromeApiProxy } from "@eko-ai/eko";
import { LLMConfig, WorkflowCallback, Workflow } from "@eko-ai/eko/types";
import { getLLMConfig } from "@eko-ai/eko/extension";

class MyChromeProxy {
  public static windows_create(createData: chrome.windows.CreateData): Promise<chrome.windows.Window> {
    console.log("this will create a window");
    return chrome.windows.create(createData);
  }
}

let eko: Eko;
let currentWorkflow: Workflow;

export async function main(prompt: string) {
  let chromeProxy = createChromeApiProxy(MyChromeProxy);
  let config = await getLLMConfig(chromeProxy);
  if (!config || !config.apiKey) {
    printLog("Please configure apiKey", "error");
    return;
  }

  eko = new Eko(config as LLMConfig, { callback: hookLogs(), chromeProxy: chromeProxy });

  currentWorkflow = await eko.generate(prompt);

  await eko.execute(currentWorkflow);
}

export async function cancelWorkflow() {
  if (currentWorkflow) {
    await eko.cancel(currentWorkflow);
  }
}

function hookLogs(): WorkflowCallback {
  return {
    hooks: {
      beforeWorkflow: async (workflow) => {
        printLog("Start workflow: " + workflow.name);
      },
      beforeSubtask: async (subtask, context) => {
        printLog("> subtask: " + subtask.name);
      },
      beforeToolUse: async (tool, context, input) => {
        printLog("> tool: " + tool.name);
        return input;
      },
      afterToolUse: async (tool, context, result) => {
        printLog("  tool: " + tool.name + " completed", "success");
        return result;
      },
      afterSubtask: async (subtask, context, result) => {
        printLog("  subtask: " + subtask.name + " completed", "success");
      },
      afterWorkflow: async (workflow, variables) => {
        printLog("Completed", "success");
      },
      onLlmMessage: async (textContent) => {
        printLog("LLM: " + textContent);
      },
      onHumanInputText: async (question) => {
        // 实现人机交互的文本输入钩子函数
        return new Promise((resolve) => {
          chrome.runtime.sendMessage({ type: "humanInputText", question }, (response) => {
            resolve(response.answer);
          });
        });
      },
      onHumanInputSingleChoice: async (question, choices) => {
        // 实现人机交互的单选钩子函数
        return new Promise((resolve) => {
          chrome.runtime.sendMessage({ type: "humanInputSingleChoice", question, choices }, (response) => {
            resolve(response.answer);
          });
        });
      },
      onHumanInputMultipleChoice: async (question, choices) => {
        // 实现人机交互的多选钩子函数
        return new Promise((resolve) => {
          chrome.runtime.sendMessage({ type: "humanInputMultipleChoice", question, choices }, (response) => {
            resolve(response.answer);
          });
        });
      },
      onHumanOperate: async (reason) => {
        // 实现人机交互的操作钩子函数
        return new Promise((resolve) => {
          chrome.runtime.sendMessage({ type: "humanOperate", reason }, (response) => {
            resolve(response.userOperation);
          });
        });
      },
    },
  };
}

function printLog(log: string, level?: "info" | "success" | "error") {
  chrome.runtime.sendMessage({ type: "log", log, level: level || "info" });
}
