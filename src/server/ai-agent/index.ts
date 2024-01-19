import OpenAI from 'openai';
import { ChatCompletion, ChatCompletionMessageParam, ChatCompletionMessageToolCall } from 'openai/resources/index.mjs';
import { Goto, PageGotoCompletionTool, PageGotoParameters } from '../playwright-api/page-api/goto.js';
import { IPlaywrightApi } from '../playwright-api/index.js';


// Right now I'm just making something that will work and will
// make a more robust implementation later.

export class Agent {
  private chrome: IPlaywrightApi;
  private openai: OpenAI = new OpenAI();
  private sessionId: string;
  private pageId: string;
  private model = 'gpt-3.5-turbo-1106';
  private prompt = `
    You are a helpful AI assistant that is an expert at using Playwright. You will be given tasks by a user
    to help QA websites. You will complete the task using the functions provided to you to interact with
    Playwright. When you finish with your QA task you will respond with the results of your QA task.
  `;
  private tools = [PageGotoCompletionTool];
  private messages: ChatCompletionMessageParam[] = [];
  
  constructor(chrome: IPlaywrightApi, sessionId: string, pageId: string) {
    this.sessionId = sessionId;
    this.pageId = pageId;
    this.chrome = chrome;
    this.messages.push({ role: 'system', content: this.prompt });
    this.messages.push({ role: 'system', content: `You will use ${this.sessionId} as the session ID and ${this.pageId} as the page ID.`});
  }

  async handleTask(task: string): Promise<string> {
    this.messages.push({ role: 'user', content: task });
    const completion: ChatCompletion = await this.openai.chat.completions.create({
      messages: this.messages,
      model: this.model,
      tool_choice: 'auto',
      tools: this.tools,
    });
    return this.handleCompletionResponse(completion);
  }

  handleCompletionResponse = async (completion: ChatCompletion): Promise<string> => {
    if (completion.choices.length === 0)
      return 'The AI agent did not respond.';
  
    const message = completion.choices[0].message;
    if (message.tool_calls?.length) {
      this.messages.push(message);
      return await this.handleToolResponse(message.tool_calls);
    }
    return message.content ?? 'The AI agent did not respond.';
  }
  
  handleToolResponse = async (toolCalls: ChatCompletionMessageToolCall[]): Promise<string> => {
    for(const toolCall of toolCalls) {
      const functionResponse = await this.handleToolCall(toolCall);
      if (!functionResponse)
        continue;

      this.messages.push({
        tool_call_id: toolCall.id,
        role: 'tool',
        // @ts-ignore
        name: toolCall.function.name,
        content: JSON.stringify(functionResponse),
      });
    }
  
    return await this.handleCompletionResponse(await this.openai.chat.completions.create({
      messages: this.messages,
      model: this.model,
      tool_choice: 'auto',
      tools: this.tools,
    }));
  }
  
  handleToolCall = async (toolCall: ChatCompletionMessageToolCall): Promise<any> => {
    switch(toolCall.function.name) {
      case 'page_goto':
        return await this.handlePageGoto(toolCall);
      default:
        return null;
    }
  }
  
  handlePageGoto = async (toolCall: ChatCompletionMessageToolCall): Promise<any> => {
    const parameters = JSON.parse(toolCall.function.arguments) as PageGotoParameters;
    const page = this.chrome.getPage(parameters.sessionId, parameters.pageId);
    if (!page) {
      console.log('Page is null');
      return null;
    }

    const response = await Goto(page, parameters);
    return response;
  }
}
