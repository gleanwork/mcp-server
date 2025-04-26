import { http, HttpResponse } from 'msw';

export const handlers = [
  http.post(
    'https://:subdomain-be.glean.com/rest/api/v1/search',
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
    'https://:subdomain-be.glean.com/rest/api/v1/chat',
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
          'Content-Type': 'text/plain; charset=utf-8',
        },
      });
    },
  ),
];
