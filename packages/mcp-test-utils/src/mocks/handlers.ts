import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get(
    'https://:instance-be.glean.com/liveness_check',
    async ({ params }) => {
      const { instance } = params;

      if (instance === 'invalid-instance') {
        return new HttpResponse(null, {
          status: 404,
          statusText: 'Not Found',
        });
      }

      if (instance === 'network-error') {
        const error = new Error('Network error');
        error.name = 'FetchError';
        throw error;
      }

      return new HttpResponse(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
  ),
  http.post(
    'https://:instance-be.glean.com/rest/api/v1/search',
    async ({ request }) => {
      const authHeader = request.headers.get('Authorization');

      if (!authHeader || authHeader === 'Bearer invalid_token') {
        return new HttpResponse('Invalid Secret\nNot allowed', {
          status: 401,
          statusText: 'Unauthorized',
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
          },
        });
      }

      if (authHeader === 'Bearer expired_token') {
        return new HttpResponse('Token has expired\nNot allowed', {
          status: 401,
          statusText: 'Unauthorized',
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
          },
        });
      }

      if (authHeader === 'Bearer network_error') {
        const error = new Error('Network error');
        error.name = 'FetchError';
        throw error;
      }

      if (authHeader === 'Bearer server_error') {
        return new HttpResponse('Something went wrong', {
          status: 500,
          statusText: 'Internal Server Error',
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
          },
        });
      }

      return HttpResponse.json({
        results: [],
        trackingToken: 'mock-tracking-token',
        sessionInfo: {
          sessionTrackingToken: 'mock-session-token',
          tabId: 'mock-tab-id',
          lastSeen: new Date().toISOString(),
          lastQuery: '',
        },
      });
    },
  ),

  http.post(
    'https://:instance-be.glean.com/rest/api/v1/chat',
    async ({ request }) => {
      const authHeader = request.headers.get('Authorization');

      if (!authHeader || authHeader === 'Bearer invalid_token') {
        return new HttpResponse('Invalid Secret\nNot allowed', {
          status: 401,
          statusText: 'Unauthorized',
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
          },
        });
      }

      if (authHeader === 'Bearer expired_token') {
        return new HttpResponse('Token has expired\nNot allowed', {
          status: 401,
          statusText: 'Unauthorized',
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
          },
        });
      }

      if (authHeader === 'Bearer network_error') {
        const error = new Error('Network error');
        error.name = 'FetchError';
        throw error;
      }

      if (authHeader === 'Bearer server_error') {
        return new HttpResponse('Something went wrong', {
          status: 500,
          statusText: 'Internal Server Error',
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
          },
        });
      }

      const responseData = JSON.stringify({
        messages: [
          {
            author: 'GLEAN_AI',
            fragments: [
              {
                text: 'Search company knowledge',
              },
            ],
            messageId: '7e4c1449e53f4d5fa4eb36fca305db20',
            messageType: 'UPDATE',
            stepId: 'SEARCH',
            workflowId: 'ORIGINAL_MESSAGE_SEARCH',
          },
        ],
        followUpPrompts: [],
      });

      return new HttpResponse(responseData, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
  ),

  // Handler for people profile search (listentities)
  http.post(
    'https://:instance-be.glean.com/rest/api/v1/listentities',
    async ({ request }) => {
      const authHeader = request.headers.get('Authorization');

      if (!authHeader || authHeader === 'Bearer invalid_token') {
        return new HttpResponse('Invalid Secret\nNot allowed', {
          status: 401,
          statusText: 'Unauthorized',
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
          },
        });
      }

      if (authHeader === 'Bearer expired_token') {
        return new HttpResponse('Token has expired\nNot allowed', {
          status: 401,
          statusText: 'Unauthorized',
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
          },
        });
      }

      if (authHeader === 'Bearer network_error') {
        const error = new Error('Network error');
        error.name = 'FetchError';
        throw error;
      }

      if (authHeader === 'Bearer server_error') {
        return new HttpResponse('Something went wrong', {
          status: 500,
          statusText: 'Internal Server Error',
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
          },
        });
      }

      const responseData = {
        results: [
          {
            name: 'Jane Doe',
            obfuscatedId: 'abc123',
            metadata: {
              title: 'Software Engineer',
              department: 'Engineering',
              location: 'San Francisco',
              email: 'jane.doe@example.com',
            },
          },
        ],
        totalCount: 1,
        hasMoreResults: false,
      };

      return HttpResponse.json(responseData);
    },
  ),

  http.head(
    'https://gleanwork.github.io/mcp-server/warnings/launch/:version.md',
    async ({ params }) => {
      const { version } = params;

      if (version === 'v1') {
        return new HttpResponse(null, {
          status: 200,
          statusText: 'OK',
        });
      }

      if (version === 'v0.6') {
        return new HttpResponse(null, {
          status: 200,
          statusText: 'OK',
        });
      }

      if (version === 'v404') {
        return new HttpResponse(null, {
          status: 404,
          statusText: 'Not Found',
        });
      }

      if (version === 'v999') {
        const error = new Error('Network error');
        error.name = 'FetchError';
        throw error;
      }

      if (version === 'server-error') {
        return new HttpResponse(null, {
          status: 500,
          statusText: 'Internal Server Error',
        });
      }

      return new HttpResponse(null, {
        status: 404,
        statusText: 'Not Found',
      });
    },
  ),
];
