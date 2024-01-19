import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../server/index.js';

const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000',
    }),
  ],
});

/**
 * Inferring types
*/
const { sessionId, pages } = await trpc.createBrowserSession.query();
console.log(sessionId);
const pageId = pages[0];

const task = 'Go to the Hacker News website.';

const response = await trpc.askAgent.query({
  sessionId,
  pageId,
  task,
});

console.log(JSON.stringify(response, null, 2));

/*
const gotoResponse = await trpc.doAction.query({
  sessionId,
  pageId,
  action: 'page_goto',
  payload: {
    url: 'https://google.com',
  },
});

console.log(JSON.stringify(gotoResponse, null, 2));

await trpc.closeBrowserSession.query({sessionId});
*/