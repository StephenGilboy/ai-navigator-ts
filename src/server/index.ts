import { createHTTPServer } from '@trpc/server/adapters/standalone';
import { publicProcedure, router } from './trpc.js';
import { z } from 'zod';
import { BrowserSession, BrowserFactory, IPlaywrightApi, PlaywrightApi } from './playwright-api/index.js';
import { Goto, PageGotoCompletionTool } from './playwright-api/page-api/goto.js';
import { Agent } from './ai-agent/index.js';

const browserFactory = new BrowserFactory();
const chromeApi: IPlaywrightApi = new PlaywrightApi(await browserFactory.getChrome());

const tools = {
  [PageGotoCompletionTool.function.name]: Goto,
};

const appRouter = router({
  createBrowserSession: publicProcedure.query(async () => {
    const session: BrowserSession = await chromeApi.createSession();
    return {
      sessionId: session.id,
      pages: session.pages.map(p => p.id),
    };
  }),
  closeBrowserSession: publicProcedure
  .input(z.object({ sessionId: z.string() }))
  .query(async ({ input }) => {
    await chromeApi.closeSession(input.sessionId);
  }),
  askAgent: publicProcedure
  .input(z.object({ sessionId: z.string(), pageId: z.string(), task: z.string() })).
  query(async ({ input }) => {
    const agent = new Agent(chromeApi, input.sessionId, input.pageId);
    const response = await agent.handleTask(input.task);
    return response;
  }),
  doAction: publicProcedure
  .input(z.object({ sessionId: z.string(), pageId: z.string(), action: z.string(), payload: z.any() }))
  .query(async ({ input }) => {
    const action = tools[input.action];
    if (!action)
      return { success: false, error: `Action ${input.action} not found`, result: null };
    const page = chromeApi.getPage(input.sessionId, input.pageId);
    if (!page)
      return { success: false, error: `Page ${input.pageId} not found`, result: null };
    try {
      const result = await action(page, input.payload);
      return { success: true, result, error: null };
    }
    catch (e) {
      return { success: false, error: JSON.stringify(e), result: null };
    }
  })
});

// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter;

const server = createHTTPServer({
  router: appRouter,
});

server.listen(3000);

server.on('close', async () => {
  await chromeApi.closeAllSessions();
  await browserFactory.dispose();
});
