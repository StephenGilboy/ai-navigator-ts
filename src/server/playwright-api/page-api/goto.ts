import { Page } from '@playwright/test';
import { ChatCompletionTool } from 'openai/resources/index.mjs';

export type PageGotoResponse = {
  ok: boolean;
  status: number;
  statusText: string;
}

export type PageGotoParameters = {
  sessionId: string;
  pageId: string;
  url: string;
  options?: {
    referer?: string;
    timeout?: number;
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
  };
}

export const Goto = async (page: Page, { url, options }: PageGotoParameters): Promise<PageGotoResponse> => {
    try {
      const response = await page.goto(url, options);
      if (!response) {
        return {
          ok: false,
          status: 0,
          statusText: 'Response is null',
        };
      }
      return {
        ok: response.ok(),
        status: response.status(),
        statusText: response.statusText(),
      };
    }
    catch (e) {
      console.error(e);
      return {
        ok: false,
        status: 0,
        statusText: JSON.stringify(e),
      };
    }
};

export const PageGotoCompletionTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'page_goto',
    description: 'Navigates to a URL',
    parameters: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID',
        },
        pageId: {
          type: 'string',
          description: 'Page ID',
        },
        url: {
          type: 'string',
          description: 'URL to navigate to',
        },
        options: {
          type: 'object',
          properties: {
            referer: {
              type: 'string',
              description: 'Referer to use',
            },
            timeout: {
              type: 'number',
              description: 'Timeout in milliseconds',
            },
            waitUntil: {
              type: 'string',
              description: 'Wait until',
            },
          },
        }
      },
      required: ['sessionId', 'pageId', 'url']
    }
  }
};

