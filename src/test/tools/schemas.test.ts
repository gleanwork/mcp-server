import { describe, it, expect } from 'vitest';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { SearchSchema } from '../../tools/search.js';
import { ChatSchema } from '../../tools/chat.js';

describe('Schema to JSON Schema conversion', () => {
  it('should convert SearchSchema to JSON Schema format', () => {
    const jsonSchema = zodToJsonSchema(SearchSchema, {
      name: 'SearchSchema',
      $refStrategy: 'none',
    });

    expect(jsonSchema).toMatchInlineSnapshot(`
      {
        "$ref": "#/definitions/SearchSchema",
        "$schema": "http://json-schema.org/draft-07/schema#",
        "definitions": {
          "SearchSchema": {
            "additionalProperties": false,
            "properties": {
              "cursor": {
                "description": "Pagination cursor for position in overall results",
                "type": "string",
              },
              "disableSpellcheck": {
                "description": "Whether to disable spellcheck",
                "type": "boolean",
              },
              "inputDetails": {
                "additionalProperties": false,
                "description": "Additional metadata about the search input",
                "properties": {
                  "hasCopyPaste": {
                    "type": "boolean",
                  },
                },
                "type": "object",
              },
              "maxSnippetSize": {
                "description": "Maximum characters for snippets",
                "type": "number",
              },
              "pageSize": {
                "default": 10,
                "description": "Number of results to return",
                "type": "number",
              },
              "people": {
                "description": "People associated with the search request",
                "items": {
                  "additionalProperties": false,
                  "properties": {
                    "email": {
                      "description": "The email address of the person",
                      "type": "string",
                    },
                    "metadata": {
                      "additionalProperties": {
                        "type": "string",
                      },
                      "description": "Additional metadata about the person",
                      "type": "object",
                    },
                    "name": {
                      "description": "The display name",
                      "type": "string",
                    },
                    "obfuscatedId": {
                      "description": "An opaque identifier that can be used to request metadata for a Person",
                      "type": "string",
                    },
                    "relatedDocuments": {
                      "description": "A list of documents related to this person",
                      "items": {
                        "additionalProperties": false,
                        "properties": {
                          "associatedEntityId": {
                            "description": "Which entity in the response that this entity relates to.",
                            "type": "string",
                          },
                          "documents": {
                            "description": "A truncated list of documents with this relation. TO BE DEPRECATED.",
                            "items": {
                              "additionalProperties": false,
                              "properties": {
                                "connectorType": {
                                  "description": "The type of connector used to extract the document",
                                  "enum": [
                                    "API_CRAWL",
                                    "BROWSER_CRAWL",
                                    "BROWSER_HISTORY",
                                    "BUILTIN",
                                    "FEDERATED_SEARCH",
                                    "PUSH_API",
                                    "WEB_CRAWL",
                                    "NATIVE_HISTORY",
                                  ],
                                  "type": "string",
                                },
                                "containerDocument": {
                                  "additionalProperties": false,
                                  "description": "The container document",
                                  "properties": {
                                    "datasource": {
                                      "description": "The app or other repository type from which the document was extracted",
                                      "type": "string",
                                    },
                                    "docType": {
                                      "description": "The datasource-specific type of the document",
                                      "type": "string",
                                    },
                                    "id": {
                                      "description": "The Glean Document ID",
                                      "type": "string",
                                    },
                                    "title": {
                                      "description": "The title of the document",
                                      "type": "string",
                                    },
                                    "url": {
                                      "description": "A permalink for the document",
                                      "type": "string",
                                    },
                                  },
                                  "required": [
                                    "id",
                                  ],
                                  "type": "object",
                                },
                                "content": {
                                  "additionalProperties": false,
                                  "properties": {
                                    "fullTextList": {
                                      "description": "The plaintext content of the document",
                                      "items": {
                                        "type": "string",
                                      },
                                      "type": "array",
                                    },
                                  },
                                  "type": "object",
                                },
                                "datasource": {
                                  "description": "The app or other repository type from which the document was extracted",
                                  "type": "string",
                                },
                                "docType": {
                                  "description": "The datasource-specific type of the document",
                                  "type": "string",
                                },
                                "id": {
                                  "description": "The Glean Document ID",
                                  "type": "string",
                                },
                                "metadata": {
                                  "additionalProperties": false,
                                  "properties": {
                                    "customData": {
                                      "additionalProperties": {},
                                      "description": "Custom metadata fields",
                                      "type": "object",
                                    },
                                  },
                                  "type": "object",
                                },
                                "parentDocument": {
                                  "additionalProperties": false,
                                  "description": "The parent document",
                                  "properties": {
                                    "datasource": {
                                      "description": "The app or other repository type from which the document was extracted",
                                      "type": "string",
                                    },
                                    "docType": {
                                      "description": "The datasource-specific type of the document",
                                      "type": "string",
                                    },
                                    "id": {
                                      "description": "The Glean Document ID",
                                      "type": "string",
                                    },
                                    "title": {
                                      "description": "The title of the document",
                                      "type": "string",
                                    },
                                    "url": {
                                      "description": "A permalink for the document",
                                      "type": "string",
                                    },
                                  },
                                  "required": [
                                    "id",
                                  ],
                                  "type": "object",
                                },
                                "sections": {
                                  "description": "A list of content sub-sections in the document",
                                  "items": {
                                    "additionalProperties": false,
                                    "properties": {
                                      "content": {
                                        "description": "Section content",
                                        "type": "string",
                                      },
                                      "endIndex": {
                                        "description": "End index of section in document",
                                        "type": "number",
                                      },
                                      "level": {
                                        "description": "Heading level of the section",
                                        "type": "number",
                                      },
                                      "startIndex": {
                                        "description": "Start index of section in document",
                                        "type": "number",
                                      },
                                      "title": {
                                        "description": "Section title",
                                        "type": "string",
                                      },
                                      "type": {
                                        "description": "Type of section",
                                        "type": "string",
                                      },
                                    },
                                    "type": "object",
                                  },
                                  "type": "array",
                                },
                                "title": {
                                  "description": "The title of the document",
                                  "type": "string",
                                },
                                "url": {
                                  "description": "A permalink for the document",
                                  "type": "string",
                                },
                              },
                              "required": [
                                "id",
                              ],
                              "type": "object",
                            },
                            "type": "array",
                          },
                          "querySuggestion": {
                            "additionalProperties": false,
                            "properties": {
                              "datasource": {
                                "description": "The datasource associated with the suggestion",
                                "type": "string",
                              },
                              "label": {
                                "description": "User-facing description of the suggestion",
                                "type": "string",
                              },
                              "query": {
                                "description": "The suggested query",
                                "type": "string",
                              },
                            },
                            "required": [
                              "query",
                            ],
                            "type": "object",
                          },
                          "relation": {
                            "description": "How this document relates to the including entity.",
                            "enum": [
                              "ATTACHMENT",
                              "CANONICAL",
                              "CASE",
                              "CONTACT",
                              "CONVERSATION_MESSAGES",
                              "EXPERT",
                              "FROM",
                              "HIGHLIGHT",
                              "OPPORTUNITY",
                              "RECENT",
                              "SOURCE",
                              "TICKET",
                              "TRANSCRIPT",
                              "WITH",
                            ],
                            "type": "string",
                          },
                          "results": {
                            "description": "A truncated list of documents associated with this relation.",
                            "items": {
                              "additionalProperties": false,
                              "properties": {
                                "document": {
                                  "additionalProperties": false,
                                  "description": "The document this result represents",
                                  "properties": {
                                    "connectorType": {
                                      "description": "The type of connector used to extract the document",
                                      "enum": [
                                        "API_CRAWL",
                                        "BROWSER_CRAWL",
                                        "BROWSER_HISTORY",
                                        "BUILTIN",
                                        "FEDERATED_SEARCH",
                                        "PUSH_API",
                                        "WEB_CRAWL",
                                        "NATIVE_HISTORY",
                                      ],
                                      "type": "string",
                                    },
                                    "containerDocument": {
                                      "additionalProperties": false,
                                      "description": "The container document",
                                      "properties": {
                                        "datasource": {
                                          "description": "The app or other repository type from which the document was extracted",
                                          "type": "string",
                                        },
                                        "docType": {
                                          "description": "The datasource-specific type of the document",
                                          "type": "string",
                                        },
                                        "id": {
                                          "description": "The Glean Document ID",
                                          "type": "string",
                                        },
                                        "title": {
                                          "description": "The title of the document",
                                          "type": "string",
                                        },
                                        "url": {
                                          "description": "A permalink for the document",
                                          "type": "string",
                                        },
                                      },
                                      "required": [
                                        "id",
                                      ],
                                      "type": "object",
                                    },
                                    "content": {
                                      "additionalProperties": false,
                                      "properties": {
                                        "fullTextList": {
                                          "description": "The plaintext content of the document",
                                          "items": {
                                            "type": "string",
                                          },
                                          "type": "array",
                                        },
                                      },
                                      "type": "object",
                                    },
                                    "datasource": {
                                      "description": "The app or other repository type from which the document was extracted",
                                      "type": "string",
                                    },
                                    "docType": {
                                      "description": "The datasource-specific type of the document",
                                      "type": "string",
                                    },
                                    "id": {
                                      "description": "The Glean Document ID",
                                      "type": "string",
                                    },
                                    "metadata": {
                                      "additionalProperties": false,
                                      "properties": {
                                        "customData": {
                                          "additionalProperties": {},
                                          "description": "Custom metadata fields",
                                          "type": "object",
                                        },
                                      },
                                      "type": "object",
                                    },
                                    "parentDocument": {
                                      "additionalProperties": false,
                                      "description": "The parent document",
                                      "properties": {
                                        "datasource": {
                                          "description": "The app or other repository type from which the document was extracted",
                                          "type": "string",
                                        },
                                        "docType": {
                                          "description": "The datasource-specific type of the document",
                                          "type": "string",
                                        },
                                        "id": {
                                          "description": "The Glean Document ID",
                                          "type": "string",
                                        },
                                        "title": {
                                          "description": "The title of the document",
                                          "type": "string",
                                        },
                                        "url": {
                                          "description": "A permalink for the document",
                                          "type": "string",
                                        },
                                      },
                                      "required": [
                                        "id",
                                      ],
                                      "type": "object",
                                    },
                                    "sections": {
                                      "description": "A list of content sub-sections in the document",
                                      "items": {
                                        "additionalProperties": false,
                                        "properties": {
                                          "content": {
                                            "description": "Section content",
                                            "type": "string",
                                          },
                                          "endIndex": {
                                            "description": "End index of section in document",
                                            "type": "number",
                                          },
                                          "level": {
                                            "description": "Heading level of the section",
                                            "type": "number",
                                          },
                                          "startIndex": {
                                            "description": "Start index of section in document",
                                            "type": "number",
                                          },
                                          "title": {
                                            "description": "Section title",
                                            "type": "string",
                                          },
                                          "type": {
                                            "description": "Type of section",
                                            "type": "string",
                                          },
                                        },
                                        "type": "object",
                                      },
                                      "type": "array",
                                    },
                                    "title": {
                                      "description": "The title of the document",
                                      "type": "string",
                                    },
                                    "url": {
                                      "description": "A permalink for the document",
                                      "type": "string",
                                    },
                                  },
                                  "required": [
                                    "id",
                                  ],
                                  "type": "object",
                                },
                                "fullText": {
                                  "description": "The full body text of the result",
                                  "type": "string",
                                },
                                "fullTextList": {
                                  "description": "The full body text split by lines",
                                  "items": {
                                    "type": "string",
                                  },
                                  "type": "array",
                                },
                                "nativeAppUrl": {
                                  "description": "Deep link into datasource native application",
                                  "type": "string",
                                },
                                "snippets": {
                                  "description": "Text content from the result document",
                                  "items": {
                                    "additionalProperties": false,
                                    "properties": {
                                      "mimeType": {
                                        "description": "The mime type of the snippets",
                                        "type": "string",
                                      },
                                      "ranges": {
                                        "description": "The bolded ranges within text",
                                        "items": {
                                          "additionalProperties": false,
                                          "properties": {
                                            "document": {
                                              "additionalProperties": false,
                                              "description": "Referenced document",
                                              "properties": {
                                                "connectorType": {
                                                  "description": "The type of connector used to extract the document",
                                                  "enum": [
                                                    "API_CRAWL",
                                                    "BROWSER_CRAWL",
                                                    "BROWSER_HISTORY",
                                                    "BUILTIN",
                                                    "FEDERATED_SEARCH",
                                                    "PUSH_API",
                                                    "WEB_CRAWL",
                                                    "NATIVE_HISTORY",
                                                  ],
                                                  "type": "string",
                                                },
                                                "containerDocument": {
                                                  "additionalProperties": false,
                                                  "description": "The container document",
                                                  "properties": {
                                                    "datasource": {
                                                      "description": "The app or other repository type from which the document was extracted",
                                                      "type": "string",
                                                    },
                                                    "docType": {
                                                      "description": "The datasource-specific type of the document",
                                                      "type": "string",
                                                    },
                                                    "id": {
                                                      "description": "The Glean Document ID",
                                                      "type": "string",
                                                    },
                                                    "title": {
                                                      "description": "The title of the document",
                                                      "type": "string",
                                                    },
                                                    "url": {
                                                      "description": "A permalink for the document",
                                                      "type": "string",
                                                    },
                                                  },
                                                  "required": [
                                                    "id",
                                                  ],
                                                  "type": "object",
                                                },
                                                "content": {
                                                  "additionalProperties": false,
                                                  "properties": {
                                                    "fullTextList": {
                                                      "description": "The plaintext content of the document",
                                                      "items": {
                                                        "type": "string",
                                                      },
                                                      "type": "array",
                                                    },
                                                  },
                                                  "type": "object",
                                                },
                                                "datasource": {
                                                  "description": "The app or other repository type from which the document was extracted",
                                                  "type": "string",
                                                },
                                                "docType": {
                                                  "description": "The datasource-specific type of the document",
                                                  "type": "string",
                                                },
                                                "id": {
                                                  "description": "The Glean Document ID",
                                                  "type": "string",
                                                },
                                                "metadata": {
                                                  "additionalProperties": false,
                                                  "properties": {
                                                    "customData": {
                                                      "additionalProperties": {},
                                                      "description": "Custom metadata fields",
                                                      "type": "object",
                                                    },
                                                  },
                                                  "type": "object",
                                                },
                                                "parentDocument": {
                                                  "additionalProperties": false,
                                                  "description": "The parent document",
                                                  "properties": {
                                                    "datasource": {
                                                      "description": "The app or other repository type from which the document was extracted",
                                                      "type": "string",
                                                    },
                                                    "docType": {
                                                      "description": "The datasource-specific type of the document",
                                                      "type": "string",
                                                    },
                                                    "id": {
                                                      "description": "The Glean Document ID",
                                                      "type": "string",
                                                    },
                                                    "title": {
                                                      "description": "The title of the document",
                                                      "type": "string",
                                                    },
                                                    "url": {
                                                      "description": "A permalink for the document",
                                                      "type": "string",
                                                    },
                                                  },
                                                  "required": [
                                                    "id",
                                                  ],
                                                  "type": "object",
                                                },
                                                "sections": {
                                                  "description": "A list of content sub-sections in the document",
                                                  "items": {
                                                    "additionalProperties": false,
                                                    "properties": {
                                                      "content": {
                                                        "description": "Section content",
                                                        "type": "string",
                                                      },
                                                      "endIndex": {
                                                        "description": "End index of section in document",
                                                        "type": "number",
                                                      },
                                                      "level": {
                                                        "description": "Heading level of the section",
                                                        "type": "number",
                                                      },
                                                      "startIndex": {
                                                        "description": "Start index of section in document",
                                                        "type": "number",
                                                      },
                                                      "title": {
                                                        "description": "Section title",
                                                        "type": "string",
                                                      },
                                                      "type": {
                                                        "description": "Type of section",
                                                        "type": "string",
                                                      },
                                                    },
                                                    "type": "object",
                                                  },
                                                  "type": "array",
                                                },
                                                "title": {
                                                  "description": "The title of the document",
                                                  "type": "string",
                                                },
                                                "url": {
                                                  "description": "A permalink for the document",
                                                  "type": "string",
                                                },
                                              },
                                              "required": [
                                                "id",
                                              ],
                                              "type": "object",
                                            },
                                            "endIndex": {
                                              "description": "Exclusive end index of the range",
                                              "type": "number",
                                            },
                                            "startIndex": {
                                              "description": "Inclusive start index of the range",
                                              "type": "number",
                                            },
                                            "type": {
                                              "description": "Type of formatting to apply",
                                              "enum": [
                                                "BOLD",
                                                "CITATION",
                                                "LINK",
                                              ],
                                              "type": "string",
                                            },
                                            "url": {
                                              "description": "URL associated with the range",
                                              "type": "string",
                                            },
                                          },
                                          "required": [
                                            "startIndex",
                                            "endIndex",
                                            "type",
                                          ],
                                          "type": "object",
                                        },
                                        "type": "array",
                                      },
                                      "snippet": {
                                        "description": "A matching snippet from the document with query term matches",
                                        "type": "string",
                                      },
                                      "snippetTextOrdering": {
                                        "description": "Used for sorting based off snippet location",
                                        "type": "number",
                                      },
                                      "text": {
                                        "description": "A matching snippet from the document with no highlights",
                                        "type": "string",
                                      },
                                      "url": {
                                        "description": "URL that links to the position of the snippet text",
                                        "type": "string",
                                      },
                                    },
                                    "required": [
                                      "snippet",
                                    ],
                                    "type": "object",
                                  },
                                  "type": "array",
                                },
                                "title": {
                                  "description": "Title of the search result",
                                  "type": "string",
                                },
                                "trackingToken": {
                                  "description": "Opaque token for this result",
                                  "type": "string",
                                },
                                "url": {
                                  "description": "URL of the search result",
                                  "type": "string",
                                },
                              },
                              "type": "object",
                            },
                            "type": "array",
                          },
                        },
                        "required": [
                          "relation",
                        ],
                        "type": "object",
                      },
                      "type": "array",
                    },
                  },
                  "required": [
                    "name",
                    "obfuscatedId",
                  ],
                  "type": "object",
                },
                "type": "array",
              },
              "query": {
                "description": "The search terms",
                "type": "string",
              },
              "requestOptions": {
                "additionalProperties": false,
                "description": "Options for the search request",
                "properties": {
                  "authTokens": {
                    "items": {
                      "additionalProperties": false,
                      "properties": {
                        "accessToken": {
                          "description": "The access token",
                          "type": "string",
                        },
                        "authUser": {
                          "description": "User associated with this token",
                          "type": "string",
                        },
                        "datasource": {
                          "description": "The datasource this token is for",
                          "type": "string",
                        },
                        "expiration": {
                          "description": "Token expiration timestamp",
                          "type": "number",
                        },
                        "scope": {
                          "description": "OAuth scope of the token",
                          "type": "string",
                        },
                        "tokenType": {
                          "description": "Type of the token",
                          "type": "string",
                        },
                      },
                      "required": [
                        "accessToken",
                        "datasource",
                      ],
                      "type": "object",
                    },
                    "type": "array",
                  },
                  "datasourceFilter": {
                    "description": "Filter results to a single datasource name",
                    "type": "string",
                  },
                  "datasourcesFilter": {
                    "description": "Filter results to one or more datasources",
                    "items": {
                      "type": "string",
                    },
                    "type": "array",
                  },
                  "defaultFacets": {
                    "description": "Facets for which FacetResults should be fetched",
                    "items": {
                      "type": "string",
                    },
                    "type": "array",
                  },
                  "disableQueryAutocorrect": {
                    "description": "Disables automatic adjustment of the input query",
                    "type": "boolean",
                  },
                  "disableSpellcheck": {
                    "description": "Whether to disable spellcheck",
                    "type": "boolean",
                  },
                  "exclusions": {
                    "additionalProperties": false,
                    "description": "Filters specifying content to avoid in search results",
                    "properties": {
                      "containerSpecs": {
                        "items": {
                          "anyOf": [
                            {
                              "additionalProperties": false,
                              "properties": {
                                "url": {
                                  "description": "The URL of the document",
                                  "type": "string",
                                },
                              },
                              "type": "object",
                            },
                            {
                              "additionalProperties": false,
                              "properties": {
                                "id": {
                                  "description": "The ID of the document",
                                  "type": "string",
                                },
                              },
                              "type": "object",
                            },
                            {
                              "additionalProperties": false,
                              "properties": {
                                "contentId": {
                                  "description": "The id for user generated content",
                                  "type": "number",
                                },
                                "docType": {
                                  "description": "The specific type of the user generated content type",
                                  "type": "string",
                                },
                                "ugcType": {
                                  "description": "The type of the user generated content",
                                  "enum": [
                                    "ANNOUNCEMENTS",
                                    "ANSWERS",
                                    "COLLECTIONS",
                                    "SHORTCUTS",
                                  ],
                                  "type": "string",
                                },
                              },
                              "type": "object",
                            },
                          ],
                        },
                        "type": "array",
                      },
                    },
                    "type": "object",
                  },
                  "facetBucketFilter": {
                    "additionalProperties": false,
                    "properties": {
                      "facet": {
                        "description": "The facet to filter",
                        "type": "string",
                      },
                      "prefix": {
                        "description": "Prefix to filter facet values by",
                        "type": "string",
                      },
                    },
                    "type": "object",
                  },
                  "facetBucketSize": {
                    "type": "number",
                  },
                  "facetFilterSets": {
                    "items": {
                      "additionalProperties": false,
                      "properties": {
                        "filters": {
                          "description": "List of filters in this set",
                          "items": {
                            "additionalProperties": false,
                            "properties": {
                              "fieldName": {
                                "description": "Name of the field to filter on",
                                "type": "string",
                              },
                              "groupName": {
                                "description": "Name of the filter group",
                                "type": "string",
                              },
                              "values": {
                                "description": "Values to filter by",
                                "items": {
                                  "additionalProperties": false,
                                  "properties": {
                                    "isNegated": {
                                      "description": "DEPRECATED - Whether the filter is negated",
                                      "type": "boolean",
                                    },
                                    "relationType": {
                                      "description": "Type of relation",
                                      "enum": [
                                        "EQUALS",
                                        "ID_EQUALS",
                                        "LT",
                                        "GT",
                                      ],
                                      "type": "string",
                                    },
                                    "value": {
                                      "description": "Filter value",
                                      "type": "string",
                                    },
                                  },
                                  "required": [
                                    "value",
                                  ],
                                  "type": "object",
                                },
                                "type": "array",
                              },
                            },
                            "required": [
                              "fieldName",
                              "values",
                            ],
                            "type": "object",
                          },
                          "type": "array",
                        },
                      },
                      "type": "object",
                    },
                    "type": "array",
                  },
                  "facetFilters": {
                    "description": "List of filters for the query (ANDed together)",
                    "items": {
                      "additionalProperties": false,
                      "properties": {
                        "fieldName": {
                          "description": "Name of the field to filter on",
                          "type": "string",
                        },
                        "groupName": {
                          "description": "Name of the filter group",
                          "type": "string",
                        },
                        "values": {
                          "description": "Values to filter by",
                          "items": {
                            "additionalProperties": false,
                            "properties": {
                              "isNegated": {
                                "description": "DEPRECATED - Whether the filter is negated",
                                "type": "boolean",
                              },
                              "relationType": {
                                "description": "Type of relation",
                                "enum": [
                                  "EQUALS",
                                  "ID_EQUALS",
                                  "LT",
                                  "GT",
                                ],
                                "type": "string",
                              },
                              "value": {
                                "description": "Filter value",
                                "type": "string",
                              },
                            },
                            "required": [
                              "value",
                            ],
                            "type": "object",
                          },
                          "type": "array",
                        },
                      },
                      "required": [
                        "fieldName",
                        "values",
                      ],
                      "type": "object",
                    },
                    "type": "array",
                  },
                  "fetchAllDatasourceCounts": {
                    "description": "Return result counts for all supported datasources",
                    "type": "boolean",
                  },
                  "inclusions": {
                    "additionalProperties": false,
                    "description": "Filters to restrict search results to only specified content",
                    "properties": {
                      "containerSpecs": {
                        "items": {
                          "anyOf": [
                            {
                              "additionalProperties": false,
                              "properties": {
                                "url": {
                                  "description": "The URL of the document",
                                  "type": "string",
                                },
                              },
                              "type": "object",
                            },
                            {
                              "additionalProperties": false,
                              "properties": {
                                "id": {
                                  "description": "The ID of the document",
                                  "type": "string",
                                },
                              },
                              "type": "object",
                            },
                            {
                              "additionalProperties": false,
                              "properties": {
                                "contentId": {
                                  "description": "The id for user generated content",
                                  "type": "number",
                                },
                                "docType": {
                                  "description": "The specific type of the user generated content type",
                                  "type": "string",
                                },
                                "ugcType": {
                                  "description": "The type of the user generated content",
                                  "enum": [
                                    "ANNOUNCEMENTS",
                                    "ANSWERS",
                                    "COLLECTIONS",
                                    "SHORTCUTS",
                                  ],
                                  "type": "string",
                                },
                              },
                              "type": "object",
                            },
                          ],
                        },
                        "type": "array",
                      },
                    },
                    "type": "object",
                  },
                  "queryOverridesFacetFilters": {
                    "description": "If true, query operators override facet filters in case of conflict",
                    "type": "boolean",
                  },
                  "responseHints": {
                    "description": "Hints for the response content",
                    "items": {
                      "enum": [
                        "ALL_RESULT_COUNTS",
                        "FACET_RESULTS",
                        "QUERY_METADATA",
                        "RESULTS",
                        "SPELLCHECK_METADATA",
                      ],
                      "type": "string",
                    },
                    "type": "array",
                  },
                  "returnLlmContentOverSnippets": {
                    "description": "Enables expanded content to be returned for LLM usage",
                    "type": "boolean",
                  },
                  "timezoneOffset": {
                    "description": "Offset of client timezone in minutes from UTC",
                    "type": "number",
                  },
                },
                "required": [
                  "facetBucketSize",
                ],
                "type": "object",
              },
              "resultTabIds": {
                "description": "Unique IDs of result tabs to fetch",
                "items": {
                  "type": "string",
                },
                "type": "array",
              },
              "timeoutMillis": {
                "description": "Request timeout in milliseconds",
                "type": "number",
              },
              "timestamp": {
                "description": "ISO 8601 timestamp of client request",
                "type": "string",
              },
              "trackingToken": {
                "description": "Previous tracking token for same query",
                "type": "string",
              },
            },
            "required": [
              "query",
            ],
            "type": "object",
          },
        },
      }
    `);
  });

  it('should convert ChatSchema to JSON Schema format', () => {
    const jsonSchema = zodToJsonSchema(ChatSchema, {
      name: 'ChatSchema',
      $refStrategy: 'none',
    });

    expect(jsonSchema).toMatchInlineSnapshot(`
      {
        "$ref": "#/definitions/ChatSchema",
        "$schema": "http://json-schema.org/draft-07/schema#",
        "definitions": {
          "ChatSchema": {
            "additionalProperties": false,
            "properties": {
              "agentConfig": {
                "additionalProperties": false,
                "description": "Describes the agent that will execute the request",
                "properties": {
                  "agent": {
                    "default": "DEFAULT",
                    "description": "Name of the agent",
                    "enum": [
                      "DEFAULT",
                      "GPT",
                    ],
                    "type": "string",
                  },
                  "mode": {
                    "default": "DEFAULT",
                    "description": "Top level modes to run GleanChat in",
                    "enum": [
                      "DEFAULT",
                      "QUICK",
                    ],
                    "type": "string",
                  },
                },
                "type": "object",
              },
              "applicationId": {
                "description": "ID of the application this request originates from",
                "type": "string",
              },
              "chatId": {
                "description": "ID of the Chat to retrieve context from and add messages to",
                "type": "string",
              },
              "exclusions": {
                "additionalProperties": false,
                "description": "Filters that disallow chat from accessing certain content",
                "properties": {
                  "containerSpecs": {
                    "description": "Specifications for containers that should be used as part of the restriction",
                    "items": {
                      "anyOf": [
                        {
                          "additionalProperties": false,
                          "properties": {
                            "url": {
                              "description": "The URL of the document",
                              "type": "string",
                            },
                          },
                          "type": "object",
                        },
                        {
                          "additionalProperties": false,
                          "properties": {
                            "id": {
                              "description": "The ID of the document",
                              "type": "string",
                            },
                          },
                          "type": "object",
                        },
                        {
                          "additionalProperties": false,
                          "properties": {
                            "contentId": {
                              "description": "The id for user generated content",
                              "type": "number",
                            },
                            "docType": {
                              "description": "The specific type of the user generated content type",
                              "type": "string",
                            },
                            "ugcType": {
                              "description": "The type of the user generated content",
                              "enum": [
                                "ANNOUNCEMENTS",
                                "ANSWERS",
                                "COLLECTIONS",
                                "SHORTCUTS",
                              ],
                              "type": "string",
                            },
                          },
                          "type": "object",
                        },
                      ],
                    },
                    "type": "array",
                  },
                },
                "type": "object",
              },
              "inclusions": {
                "additionalProperties": false,
                "description": "Filters that only allow chat to access certain content",
                "properties": {
                  "containerSpecs": {
                    "description": "Specifications for containers that should be used as part of the restriction",
                    "items": {
                      "anyOf": [
                        {
                          "additionalProperties": false,
                          "properties": {
                            "url": {
                              "description": "The URL of the document",
                              "type": "string",
                            },
                          },
                          "type": "object",
                        },
                        {
                          "additionalProperties": false,
                          "properties": {
                            "id": {
                              "description": "The ID of the document",
                              "type": "string",
                            },
                          },
                          "type": "object",
                        },
                        {
                          "additionalProperties": false,
                          "properties": {
                            "contentId": {
                              "description": "The id for user generated content",
                              "type": "number",
                            },
                            "docType": {
                              "description": "The specific type of the user generated content type",
                              "type": "string",
                            },
                            "ugcType": {
                              "description": "The type of the user generated content",
                              "enum": [
                                "ANNOUNCEMENTS",
                                "ANSWERS",
                                "COLLECTIONS",
                                "SHORTCUTS",
                              ],
                              "type": "string",
                            },
                          },
                          "type": "object",
                        },
                      ],
                    },
                    "type": "array",
                  },
                },
                "type": "object",
              },
              "messages": {
                "description": "List of chat messages, from most recent to least recent",
                "items": {
                  "additionalProperties": false,
                  "properties": {
                    "agentConfig": {
                      "additionalProperties": false,
                      "description": "Agent config that generated this message",
                      "properties": {
                        "agent": {
                          "default": "DEFAULT",
                          "description": "Name of the agent",
                          "enum": [
                            "DEFAULT",
                            "GPT",
                          ],
                          "type": "string",
                        },
                        "mode": {
                          "default": "DEFAULT",
                          "description": "Top level modes to run GleanChat in",
                          "enum": [
                            "DEFAULT",
                            "QUICK",
                          ],
                          "type": "string",
                        },
                      },
                      "type": "object",
                    },
                    "author": {
                      "default": "USER",
                      "description": "Author of the message",
                      "enum": [
                        "USER",
                        "GLEAN_AI",
                      ],
                      "type": "string",
                    },
                    "citations": {
                      "description": "Citations used to generate the response",
                      "items": {
                        "additionalProperties": false,
                        "properties": {
                          "sourceDocument": {
                            "additionalProperties": false,
                            "description": "The document that is the source of the citation",
                            "properties": {
                              "id": {
                                "description": "Document ID",
                                "type": "string",
                              },
                              "referenceRanges": {
                                "description": "Ranges within the document that are referenced",
                                "items": {
                                  "additionalProperties": false,
                                  "properties": {
                                    "textRange": {
                                      "additionalProperties": false,
                                      "description": "A subsection of text with special formatting",
                                      "properties": {
                                        "document": {
                                          "additionalProperties": false,
                                          "description": "Referenced document",
                                          "properties": {
                                            "connectorType": {
                                              "description": "The type of connector used to extract the document",
                                              "enum": [
                                                "API_CRAWL",
                                                "BROWSER_CRAWL",
                                                "BROWSER_HISTORY",
                                                "BUILTIN",
                                                "FEDERATED_SEARCH",
                                                "PUSH_API",
                                                "WEB_CRAWL",
                                                "NATIVE_HISTORY",
                                              ],
                                              "type": "string",
                                            },
                                            "containerDocument": {
                                              "additionalProperties": false,
                                              "description": "The container document",
                                              "properties": {
                                                "datasource": {
                                                  "description": "The app or other repository type from which the document was extracted",
                                                  "type": "string",
                                                },
                                                "docType": {
                                                  "description": "The datasource-specific type of the document",
                                                  "type": "string",
                                                },
                                                "id": {
                                                  "description": "The Glean Document ID",
                                                  "type": "string",
                                                },
                                                "title": {
                                                  "description": "The title of the document",
                                                  "type": "string",
                                                },
                                                "url": {
                                                  "description": "A permalink for the document",
                                                  "type": "string",
                                                },
                                              },
                                              "required": [
                                                "id",
                                              ],
                                              "type": "object",
                                            },
                                            "content": {
                                              "additionalProperties": false,
                                              "properties": {
                                                "fullTextList": {
                                                  "description": "The plaintext content of the document",
                                                  "items": {
                                                    "type": "string",
                                                  },
                                                  "type": "array",
                                                },
                                              },
                                              "type": "object",
                                            },
                                            "datasource": {
                                              "description": "The app or other repository type from which the document was extracted",
                                              "type": "string",
                                            },
                                            "docType": {
                                              "description": "The datasource-specific type of the document",
                                              "type": "string",
                                            },
                                            "id": {
                                              "description": "The Glean Document ID",
                                              "type": "string",
                                            },
                                            "metadata": {
                                              "additionalProperties": false,
                                              "properties": {
                                                "customData": {
                                                  "additionalProperties": {},
                                                  "description": "Custom metadata fields",
                                                  "type": "object",
                                                },
                                              },
                                              "type": "object",
                                            },
                                            "parentDocument": {
                                              "additionalProperties": false,
                                              "description": "The parent document",
                                              "properties": {
                                                "datasource": {
                                                  "description": "The app or other repository type from which the document was extracted",
                                                  "type": "string",
                                                },
                                                "docType": {
                                                  "description": "The datasource-specific type of the document",
                                                  "type": "string",
                                                },
                                                "id": {
                                                  "description": "The Glean Document ID",
                                                  "type": "string",
                                                },
                                                "title": {
                                                  "description": "The title of the document",
                                                  "type": "string",
                                                },
                                                "url": {
                                                  "description": "A permalink for the document",
                                                  "type": "string",
                                                },
                                              },
                                              "required": [
                                                "id",
                                              ],
                                              "type": "object",
                                            },
                                            "sections": {
                                              "description": "A list of content sub-sections in the document",
                                              "items": {
                                                "additionalProperties": false,
                                                "properties": {
                                                  "content": {
                                                    "description": "Section content",
                                                    "type": "string",
                                                  },
                                                  "endIndex": {
                                                    "description": "End index of section in document",
                                                    "type": "number",
                                                  },
                                                  "level": {
                                                    "description": "Heading level of the section",
                                                    "type": "number",
                                                  },
                                                  "startIndex": {
                                                    "description": "Start index of section in document",
                                                    "type": "number",
                                                  },
                                                  "title": {
                                                    "description": "Section title",
                                                    "type": "string",
                                                  },
                                                  "type": {
                                                    "description": "Type of section",
                                                    "type": "string",
                                                  },
                                                },
                                                "type": "object",
                                              },
                                              "type": "array",
                                            },
                                            "title": {
                                              "description": "The title of the document",
                                              "type": "string",
                                            },
                                            "url": {
                                              "description": "A permalink for the document",
                                              "type": "string",
                                            },
                                          },
                                          "required": [
                                            "id",
                                          ],
                                          "type": "object",
                                        },
                                        "endIndex": {
                                          "description": "Exclusive end index of the range",
                                          "type": "number",
                                        },
                                        "startIndex": {
                                          "description": "Inclusive start index of the range",
                                          "type": "number",
                                        },
                                        "type": {
                                          "description": "Type of formatting to apply",
                                          "enum": [
                                            "BOLD",
                                            "CITATION",
                                            "LINK",
                                          ],
                                          "type": "string",
                                        },
                                        "url": {
                                          "description": "URL associated with the range",
                                          "type": "string",
                                        },
                                      },
                                      "required": [
                                        "startIndex",
                                        "endIndex",
                                        "type",
                                      ],
                                      "type": "object",
                                    },
                                  },
                                  "required": [
                                    "textRange",
                                  ],
                                  "type": "object",
                                },
                                "type": "array",
                              },
                              "title": {
                                "description": "Document title",
                                "type": "string",
                              },
                            },
                            "required": [
                              "id",
                            ],
                            "type": "object",
                          },
                        },
                        "required": [
                          "sourceDocument",
                        ],
                        "type": "object",
                      },
                      "type": "array",
                    },
                    "fragments": {
                      "description": "Rich data representing the response or request",
                      "items": {
                        "additionalProperties": false,
                        "properties": {
                          "action": {
                            "additionalProperties": false,
                            "description": "Action information for the fragment",
                            "properties": {
                              "parameters": {
                                "additionalProperties": {
                                  "additionalProperties": false,
                                  "properties": {
                                    "description": {
                                      "description": "Description of the parameter",
                                      "type": "string",
                                    },
                                    "displayName": {
                                      "description": "Display name for the parameter",
                                      "type": "string",
                                    },
                                    "isRequired": {
                                      "description": "Whether the parameter is required",
                                      "type": "boolean",
                                    },
                                    "label": {
                                      "description": "Label for the parameter",
                                      "type": "string",
                                    },
                                    "type": {
                                      "description": "Data type of the parameter",
                                      "enum": [
                                        "UNKNOWN",
                                        "INTEGER",
                                        "STRING",
                                        "BOOLEAN",
                                      ],
                                      "type": "string",
                                    },
                                    "value": {
                                      "description": "Value of the parameter",
                                      "type": "string",
                                    },
                                  },
                                  "type": "object",
                                },
                                "description": "Map of parameter names to parameter definitions",
                                "type": "object",
                              },
                            },
                            "type": "object",
                          },
                          "file": {
                            "additionalProperties": false,
                            "description": "File referenced in the message fragment",
                            "properties": {
                              "id": {
                                "description": "Unique identifier for the file",
                                "type": "string",
                              },
                              "name": {
                                "description": "Name of the file",
                                "type": "string",
                              },
                            },
                            "required": [
                              "id",
                              "name",
                            ],
                            "type": "object",
                          },
                          "querySuggestion": {
                            "additionalProperties": false,
                            "description": "Search query suggestion associated with the fragment",
                            "properties": {
                              "datasource": {
                                "description": "The datasource associated with the suggestion",
                                "type": "string",
                              },
                              "label": {
                                "description": "User-facing description of the suggestion",
                                "type": "string",
                              },
                              "query": {
                                "description": "The suggested query",
                                "type": "string",
                              },
                            },
                            "required": [
                              "query",
                            ],
                            "type": "object",
                          },
                          "structuredResults": {
                            "description": "Structured results associated with the fragment",
                            "items": {
                              "additionalProperties": false,
                              "properties": {
                                "document": {
                                  "additionalProperties": false,
                                  "description": "The document this result represents",
                                  "properties": {
                                    "connectorType": {
                                      "description": "The type of connector used to extract the document",
                                      "enum": [
                                        "API_CRAWL",
                                        "BROWSER_CRAWL",
                                        "BROWSER_HISTORY",
                                        "BUILTIN",
                                        "FEDERATED_SEARCH",
                                        "PUSH_API",
                                        "WEB_CRAWL",
                                        "NATIVE_HISTORY",
                                      ],
                                      "type": "string",
                                    },
                                    "containerDocument": {
                                      "additionalProperties": false,
                                      "description": "The container document",
                                      "properties": {
                                        "datasource": {
                                          "description": "The app or other repository type from which the document was extracted",
                                          "type": "string",
                                        },
                                        "docType": {
                                          "description": "The datasource-specific type of the document",
                                          "type": "string",
                                        },
                                        "id": {
                                          "description": "The Glean Document ID",
                                          "type": "string",
                                        },
                                        "title": {
                                          "description": "The title of the document",
                                          "type": "string",
                                        },
                                        "url": {
                                          "description": "A permalink for the document",
                                          "type": "string",
                                        },
                                      },
                                      "required": [
                                        "id",
                                      ],
                                      "type": "object",
                                    },
                                    "content": {
                                      "additionalProperties": false,
                                      "properties": {
                                        "fullTextList": {
                                          "description": "The plaintext content of the document",
                                          "items": {
                                            "type": "string",
                                          },
                                          "type": "array",
                                        },
                                      },
                                      "type": "object",
                                    },
                                    "datasource": {
                                      "description": "The app or other repository type from which the document was extracted",
                                      "type": "string",
                                    },
                                    "docType": {
                                      "description": "The datasource-specific type of the document",
                                      "type": "string",
                                    },
                                    "id": {
                                      "description": "The Glean Document ID",
                                      "type": "string",
                                    },
                                    "metadata": {
                                      "additionalProperties": false,
                                      "properties": {
                                        "customData": {
                                          "additionalProperties": {},
                                          "description": "Custom metadata fields",
                                          "type": "object",
                                        },
                                      },
                                      "type": "object",
                                    },
                                    "parentDocument": {
                                      "additionalProperties": false,
                                      "description": "The parent document",
                                      "properties": {
                                        "datasource": {
                                          "description": "The app or other repository type from which the document was extracted",
                                          "type": "string",
                                        },
                                        "docType": {
                                          "description": "The datasource-specific type of the document",
                                          "type": "string",
                                        },
                                        "id": {
                                          "description": "The Glean Document ID",
                                          "type": "string",
                                        },
                                        "title": {
                                          "description": "The title of the document",
                                          "type": "string",
                                        },
                                        "url": {
                                          "description": "A permalink for the document",
                                          "type": "string",
                                        },
                                      },
                                      "required": [
                                        "id",
                                      ],
                                      "type": "object",
                                    },
                                    "sections": {
                                      "description": "A list of content sub-sections in the document",
                                      "items": {
                                        "additionalProperties": false,
                                        "properties": {
                                          "content": {
                                            "description": "Section content",
                                            "type": "string",
                                          },
                                          "endIndex": {
                                            "description": "End index of section in document",
                                            "type": "number",
                                          },
                                          "level": {
                                            "description": "Heading level of the section",
                                            "type": "number",
                                          },
                                          "startIndex": {
                                            "description": "Start index of section in document",
                                            "type": "number",
                                          },
                                          "title": {
                                            "description": "Section title",
                                            "type": "string",
                                          },
                                          "type": {
                                            "description": "Type of section",
                                            "type": "string",
                                          },
                                        },
                                        "type": "object",
                                      },
                                      "type": "array",
                                    },
                                    "title": {
                                      "description": "The title of the document",
                                      "type": "string",
                                    },
                                    "url": {
                                      "description": "A permalink for the document",
                                      "type": "string",
                                    },
                                  },
                                  "required": [
                                    "id",
                                  ],
                                  "type": "object",
                                },
                                "snippets": {
                                  "description": "Any snippets associated to the populated object",
                                  "items": {
                                    "additionalProperties": false,
                                    "properties": {
                                      "mimeType": {
                                        "description": "The mime type of the snippets",
                                        "type": "string",
                                      },
                                      "ranges": {
                                        "description": "The bolded ranges within text",
                                        "items": {
                                          "additionalProperties": false,
                                          "properties": {
                                            "document": {
                                              "additionalProperties": false,
                                              "description": "Referenced document",
                                              "properties": {
                                                "connectorType": {
                                                  "description": "The type of connector used to extract the document",
                                                  "enum": [
                                                    "API_CRAWL",
                                                    "BROWSER_CRAWL",
                                                    "BROWSER_HISTORY",
                                                    "BUILTIN",
                                                    "FEDERATED_SEARCH",
                                                    "PUSH_API",
                                                    "WEB_CRAWL",
                                                    "NATIVE_HISTORY",
                                                  ],
                                                  "type": "string",
                                                },
                                                "containerDocument": {
                                                  "additionalProperties": false,
                                                  "description": "The container document",
                                                  "properties": {
                                                    "datasource": {
                                                      "description": "The app or other repository type from which the document was extracted",
                                                      "type": "string",
                                                    },
                                                    "docType": {
                                                      "description": "The datasource-specific type of the document",
                                                      "type": "string",
                                                    },
                                                    "id": {
                                                      "description": "The Glean Document ID",
                                                      "type": "string",
                                                    },
                                                    "title": {
                                                      "description": "The title of the document",
                                                      "type": "string",
                                                    },
                                                    "url": {
                                                      "description": "A permalink for the document",
                                                      "type": "string",
                                                    },
                                                  },
                                                  "required": [
                                                    "id",
                                                  ],
                                                  "type": "object",
                                                },
                                                "content": {
                                                  "additionalProperties": false,
                                                  "properties": {
                                                    "fullTextList": {
                                                      "description": "The plaintext content of the document",
                                                      "items": {
                                                        "type": "string",
                                                      },
                                                      "type": "array",
                                                    },
                                                  },
                                                  "type": "object",
                                                },
                                                "datasource": {
                                                  "description": "The app or other repository type from which the document was extracted",
                                                  "type": "string",
                                                },
                                                "docType": {
                                                  "description": "The datasource-specific type of the document",
                                                  "type": "string",
                                                },
                                                "id": {
                                                  "description": "The Glean Document ID",
                                                  "type": "string",
                                                },
                                                "metadata": {
                                                  "additionalProperties": false,
                                                  "properties": {
                                                    "customData": {
                                                      "additionalProperties": {},
                                                      "description": "Custom metadata fields",
                                                      "type": "object",
                                                    },
                                                  },
                                                  "type": "object",
                                                },
                                                "parentDocument": {
                                                  "additionalProperties": false,
                                                  "description": "The parent document",
                                                  "properties": {
                                                    "datasource": {
                                                      "description": "The app or other repository type from which the document was extracted",
                                                      "type": "string",
                                                    },
                                                    "docType": {
                                                      "description": "The datasource-specific type of the document",
                                                      "type": "string",
                                                    },
                                                    "id": {
                                                      "description": "The Glean Document ID",
                                                      "type": "string",
                                                    },
                                                    "title": {
                                                      "description": "The title of the document",
                                                      "type": "string",
                                                    },
                                                    "url": {
                                                      "description": "A permalink for the document",
                                                      "type": "string",
                                                    },
                                                  },
                                                  "required": [
                                                    "id",
                                                  ],
                                                  "type": "object",
                                                },
                                                "sections": {
                                                  "description": "A list of content sub-sections in the document",
                                                  "items": {
                                                    "additionalProperties": false,
                                                    "properties": {
                                                      "content": {
                                                        "description": "Section content",
                                                        "type": "string",
                                                      },
                                                      "endIndex": {
                                                        "description": "End index of section in document",
                                                        "type": "number",
                                                      },
                                                      "level": {
                                                        "description": "Heading level of the section",
                                                        "type": "number",
                                                      },
                                                      "startIndex": {
                                                        "description": "Start index of section in document",
                                                        "type": "number",
                                                      },
                                                      "title": {
                                                        "description": "Section title",
                                                        "type": "string",
                                                      },
                                                      "type": {
                                                        "description": "Type of section",
                                                        "type": "string",
                                                      },
                                                    },
                                                    "type": "object",
                                                  },
                                                  "type": "array",
                                                },
                                                "title": {
                                                  "description": "The title of the document",
                                                  "type": "string",
                                                },
                                                "url": {
                                                  "description": "A permalink for the document",
                                                  "type": "string",
                                                },
                                              },
                                              "required": [
                                                "id",
                                              ],
                                              "type": "object",
                                            },
                                            "endIndex": {
                                              "description": "Exclusive end index of the range",
                                              "type": "number",
                                            },
                                            "startIndex": {
                                              "description": "Inclusive start index of the range",
                                              "type": "number",
                                            },
                                            "type": {
                                              "description": "Type of formatting to apply",
                                              "enum": [
                                                "BOLD",
                                                "CITATION",
                                                "LINK",
                                              ],
                                              "type": "string",
                                            },
                                            "url": {
                                              "description": "URL associated with the range",
                                              "type": "string",
                                            },
                                          },
                                          "required": [
                                            "startIndex",
                                            "endIndex",
                                            "type",
                                          ],
                                          "type": "object",
                                        },
                                        "type": "array",
                                      },
                                      "snippet": {
                                        "description": "A matching snippet from the document with query term matches",
                                        "type": "string",
                                      },
                                      "snippetTextOrdering": {
                                        "description": "Used for sorting based off snippet location",
                                        "type": "number",
                                      },
                                      "text": {
                                        "description": "A matching snippet from the document with no highlights",
                                        "type": "string",
                                      },
                                      "url": {
                                        "description": "URL that links to the position of the snippet text",
                                        "type": "string",
                                      },
                                    },
                                    "required": [
                                      "snippet",
                                    ],
                                    "type": "object",
                                  },
                                  "type": "array",
                                },
                                "trackingToken": {
                                  "description": "An opaque token that represents this particular result",
                                  "type": "string",
                                },
                              },
                              "type": "object",
                            },
                            "type": "array",
                          },
                          "text": {
                            "description": "Text content of the fragment",
                            "type": "string",
                          },
                        },
                        "type": "object",
                      },
                      "type": "array",
                    },
                    "hasMoreFragments": {
                      "description": "Whether more fragments will follow in subsequent messages",
                      "type": "boolean",
                    },
                    "messageId": {
                      "description": "Unique server-side generated ID for the message",
                      "type": "string",
                    },
                    "messageType": {
                      "default": "CONTENT",
                      "description": "Type of the message",
                      "enum": [
                        "UPDATE",
                        "CONTENT",
                        "CONTEXT",
                        "DEBUG",
                        "DEBUG_EXTERNAL",
                        "ERROR",
                        "HEADING",
                        "WARNING",
                      ],
                      "type": "string",
                    },
                    "ts": {
                      "description": "Response timestamp of the message",
                      "type": "string",
                    },
                    "uploadedFileIds": {
                      "description": "IDs of files uploaded in the message",
                      "items": {
                        "type": "string",
                      },
                      "type": "array",
                    },
                  },
                  "type": "object",
                },
                "type": "array",
              },
              "saveChat": {
                "description": "Save the interaction as a Chat for the user to access later",
                "type": "boolean",
              },
              "stream": {
                "description": "If true, response lines will be streamed one-by-one as they become available",
                "type": "boolean",
              },
              "timeoutMillis": {
                "description": "Request timeout in milliseconds",
                "type": "number",
              },
              "timezoneOffset": {
                "description": "Offset of client timezone in minutes from UTC",
                "type": "number",
              },
            },
            "required": [
              "messages",
            ],
            "type": "object",
          },
        },
      }
    `);
  });
});
