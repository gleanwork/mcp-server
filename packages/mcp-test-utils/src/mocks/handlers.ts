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

  // Handler for escalations
  http.post(
    'https://:instance-be.glean.com/rest/api/v1/escalations',
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

      if (authHeader === 'Bearer server_error') {
        return new HttpResponse('Something went wrong', {
          status: 500,
          statusText: 'Internal Server Error',
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
          },
        });
      }

      const body = (await request.json()) as {
        pageSize?: number;
        cursor?: string;
        query?: string;
      };
      const pageSize = body.pageSize ?? 50;
      const cursor = body.cursor ? parseInt(body.cursor, 10) : 0;

      const allEscalations = [
        {
          id: 'esc-001',
          title: 'Auth service outage affecting SSO',
          status: 'OPEN',
          priority: 'P1',
          createdAt: '2026-04-20T08:30:00Z',
          assignee: { name: 'Alice Smith', email: 'alice@example.com' },
          description:
            'Multiple customers reporting SSO login failures after the latest deployment.',
          url: 'https://example.com/escalations/esc-001',
        },
        {
          id: 'esc-002',
          title: 'Data pipeline latency spike',
          status: 'IN_PROGRESS',
          priority: 'P2',
          createdAt: '2026-04-19T14:00:00Z',
          assignee: { name: 'Bob Jones', email: 'bob@example.com' },
          description:
            'Indexing pipeline showing 10x latency increase since 2pm UTC.',
          url: 'https://example.com/escalations/esc-002',
        },
        {
          id: 'esc-003',
          title: 'Search relevance regression',
          status: 'RESOLVED',
          priority: 'P3',
          createdAt: '2026-04-18T10:15:00Z',
          assignee: { name: 'Carol Lee', email: 'carol@example.com' },
          description: 'Search quality dropped after model update on April 18.',
          url: 'https://example.com/escalations/esc-003',
        },
      ];

      let filtered = allEscalations;
      if (body.query) {
        const q = body.query.toLowerCase();
        filtered = allEscalations.filter(
          (e) =>
            e.title.toLowerCase().includes(q) ||
            e.description.toLowerCase().includes(q),
        );
      }

      const paged = filtered.slice(cursor, cursor + pageSize);

      return HttpResponse.json({
        results: paged,
        totalCount: filtered.length,
        hasMoreResults: cursor + pageSize < filtered.length,
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
