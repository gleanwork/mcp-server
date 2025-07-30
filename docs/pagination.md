# Pagination Support in Glean MCP Server

The Glean MCP Server now supports pagination for search results and chat responses, helping to manage large result sets and prevent token limit errors.

## Search Pagination

Both `company_search` and `people_profile_search` tools support pagination through the `cursor` parameter.

### Basic Usage

```json
// First request
{
  "query": "Docker projects",
  "pageSize": 20
}

// Response includes pagination info
{
  "results": [...],
  "cursor": "abc123",
  "hasMoreResults": true,
  "totalResults": 150
}

// Next page request
{
  "query": "Docker projects",
  "pageSize": 20,
  "cursor": "abc123"
}
```

### People Search Example

```json
// Initial search
{
  "query": "DevOps engineers",
  "filters": {
    "department": "Engineering"
  },
  "pageSize": 25
}

// Continue with cursor from response
{
  "query": "DevOps engineers", 
  "filters": {
    "department": "Engineering"
  },
  "pageSize": 25,
  "cursor": "next-page-cursor"
}
```

## Chat Response Chunking

The chat tool automatically chunks large responses that exceed token limits (~25k tokens).

### Automatic Chunking

When a chat response is too large, it's automatically split into manageable chunks:

```json
// Initial chat request
{
  "message": "Explain all our microservices architecture"
}

// Response with chunk metadata
{
  "content": "... first part of response ...",
  "_chunkMetadata": {
    "responseId": "uuid-123",
    "chunkIndex": 0,
    "totalChunks": 3,
    "hasMore": true
  }
}
```

### Continuing Chunked Responses

To get subsequent chunks:

```json
{
  "message": "",
  "continueFrom": {
    "responseId": "uuid-123",
    "chunkIndex": 1
  }
}
```

## Implementation Details

### Token Limits
- Maximum tokens per response: 20,000 (safe limit below 25k)
- Character to token ratio: ~4 characters per token

### Chunking Strategy
1. Attempts to split at paragraph boundaries (double newlines)
2. Falls back to sentence boundaries if paragraphs are too large
3. Force splits at character level for extremely long unbroken text

### Response Format
All paginated responses include:
- `cursor` or `_chunkMetadata`: Pagination state
- `hasMoreResults` or `hasMore`: Boolean indicating more data available
- `totalResults` or `totalChunks`: Total count when available

## Best Practices

1. **Set appropriate page sizes**: Balance between response size and number of requests
2. **Handle pagination in loops**: When fetching all results, continue until `hasMoreResults` is false
3. **Store cursors**: Keep track of cursors for user sessions to allow navigation
4. **Error handling**: Always check for continuation metadata before attempting to continue

## Error Handling

Common errors:
- Invalid cursor: Returns error if cursor is expired or invalid
- Invalid chunk index: Returns null if chunk doesn't exist
- Missing continuation data: Normal chat response if no previous chunks exist