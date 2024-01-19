import { Browser, BrowserContext, Page, chromium, firefox, webkit } from '@playwright/test';
import { randomUUID } from 'crypto';

/** TYPES */
export type BrowserSession = {
  id: string;
  context: BrowserContext;
  pages: PageSession[];
}

export type PageSession = {
  id: string;
  page: Page;
}

export type Action = (page: Page) => Promise<void>;

export interface IPlaywrightApi {
  createSession(): Promise<BrowserSession>;
  closeSession(sessionId: string): Promise<void>;
  closeAllSessions(): Promise<void>;
  getPage(sessionId: string, pageId: string): Page | undefined;
}

/** IMPLEMENTATION */
export class PlaywrightApi implements IPlaywrightApi {

  protected browser: Browser;
  protected sessions: BrowserSession[];

  constructor(browser: Browser) {
    this.browser = browser;
    this.sessions = [];
  }

  async createSession(): Promise<BrowserSession> {
    const context = await this.browser.newContext();
    const page = await context.newPage();
    const pageSession = {
      id: randomUUID(),
      page: page,
    };
    const browserSession = {
      id: randomUUID(),
      context: context,
      pages: [pageSession]
    };
    this.sessions.push(browserSession);
    return browserSession;
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.find(s => s.id === sessionId);
    if (session) {
      await session.context.close();
      this.sessions = this.sessions.filter(s => s.id !== sessionId);
    }
  }

  async closeAllSessions(): Promise<void> {
    for (const session of this.sessions) {
      await session.context.close();
    }
    this.sessions = [];
  }
  getPage(sessionId: string, pageId: string): Page | undefined {
    return this.sessions.find(s => s.id === sessionId)?.pages.find(p => p.id === pageId)?.page;
  }
}

export class BrowserFactory {
  private firefox: Browser | null = null;
  private chrome: Browser | null = null;
  private safari: Browser | null = null;

  async getFirefox(): Promise<Browser> {
    if (this.firefox)
      return this.firefox;

    this.firefox = await firefox.launch({
      headless: false,
    });
    return this.firefox;
  }

  async getChrome(): Promise<Browser> {
    if (this.chrome)
      return this.chrome;

    this.chrome = await chromium.launch({
      headless: false,
    });
    return this.chrome;
  }

  async getSafari(): Promise<Browser> {
    if (this.safari)
      return this.safari;

    this.safari = await webkit.launch({
      headless: false,
    });
    return this.safari;
  }

  async dispose(): Promise<void> {
    const browsers = [this.firefox, this.chrome, this.safari];
    Promise.all(browsers.map(b => b?.close()));
  }
}


// type NavigationParameters = {
//   sessionId: string;
//   url: string;
//   newPage: boolean;
// }

// type NavigationResponse = {
//   sessionId: string;
//   success: boolean;
//   error?: string;
//   pageContent: string;
// }

// type Element = {
//   tag: string;
//   id: string;
//   classList: string[];
//   textContent: string;
//   value?: string;
// }

// type ElementAction = {
//   action: string;
//   element: Element;
// }