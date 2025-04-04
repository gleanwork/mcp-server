/**
 * @fileoverview Workflow tool implementation for the Glean MCP server.
 *
 * This module provides an interface to Glean's workflow functionality through the MCP protocol.
 * It defines the schema for workflow parameters and implements the workflow functionality using
 * the Glean client SDK.
 *
 * @module tools/workflow
 */

import { z } from 'zod';
import { getClient } from '../common/client.js';
import {
  DocumentSchema,
  DocumentSpecSchema,
} from './schemas.js';

/**
 * Schema for workflow input field values.
 */
const WorkflowInputFieldValuesSchema = z.record(z.string()).describe('Key-value mapping of string -> string where the key is the name of the field in the prompt.');

/**
 * Schema for workflow input field in runworkflow requests.
 */
const WorkflowInputFieldSchema = z.object({
  name: z.string().describe('The name of the input.'),
  displayName: z.string().describe('Name of the field as displayed to the user.'),
  description: z.string().describe('Description of the field.'),
  defaultValue: z.string().describe('Default value for the field.'),
  optional: z.boolean().describe('Whether this field is optional.'),
  type: z.object({
    type: z.enum(['TEXT', 'SELECT', 'DOCUMENT']).describe('Type of the form field'),
  }),
  options: z.array(
    z.object({
      value: z.string().describe('Value of the field.'),
      label: z.string().describe('The human readable label associated with the value.'),
    })
  ).optional().describe('Options for SELECT field type.'),
});

/**
 * Schema for workflow step dependency in runworkflow requests.
 */
const WorkflowStepSchema = z.object({
  id: z.string().describe('The id of this step in the workflow.'),
  label: z.string().describe('A label associated with the step.'),
  instructionTemplate: z.string().describe('The templatic input to the workflow step.'),
  type: z.enum(['TOOL', 'AGENT', 'BRANCH']).describe('The type of the action.'),
  stepDependencies: z.array(z.string()).optional().describe('The ids of steps that the execution of this step depends on.'),
  toolConfig: z.array(
    z.object({
      id: z.string().describe('The id of the action/tool being used.'),
      name: z.string().describe('The name of the tool being used.'),
      inputTemplate: z.array(
        z.object({
          template: z.string().describe('Templatic inputs to the tool where params can be either user input fields or step ids.'),
          name: z.string().optional().describe('tool input field name which is optional.'),
        })
      ).optional(),
    })
  ).optional(),
  memoryConfig: z.enum(['ALL_DEPENDENCIES', 'IMMEDIATE_DEPENDENCIES', 'NO_MEMORY']).optional().describe('Memory used to plan the tool\'s inputs.'),
});

/**
 * Schema for workflow schema in runworkflow requests.
 */
const WorkflowSchemaSchema = z.object({
  goal: z.string().describe('The goal of the workflow. This is passed into each step.'),
  steps: z.array(WorkflowStepSchema),
  fields: z.array(WorkflowInputFieldSchema).optional().describe('Fields can be used in the goal, step instruction templates, and tool config input templates.'),
});

/**
 * Schema for chat restriction filters in runworkflow requests.
 */
const WorkflowRestrictionFilterSchema = z.object({
  containerSpecs: z.array(DocumentSpecSchema).optional().describe('Specifications for containers that should be used as part of the restriction.'),
  datasourceInstances: z.array(z.string()).optional().describe('Datasource instances that should be used as part of the restrictions.'),
  documentSpecs: z.array(DocumentSpecSchema).optional().describe('Document specifications that should be used as part of the restriction.'),
});

/**
 * Schema for global action configuration in runworkflow requests.
 */
const GlobalActionConfigurationSchema = z.object({
  searchActionConfiguration: z.object({
    inclusions: WorkflowRestrictionFilterSchema.optional().describe('A list of inclusion filters that will be applied to all search actions within the workflow'),
    exclusions: WorkflowRestrictionFilterSchema.optional().describe('A list of exclusion filters that will be applied to all search actions within the workflow'),
  }).optional().describe('ActionConfig that will be applied to Glean Search actions.'),
  applicationId: z.string().optional().describe('An optional AI app that will be used for filtering inclusions, exclusions, etc.'),
});

/**
 * Schema for chat request source info in runworkflow requests.
 */
const ChatRequestSourceInfoSchema = z.object({
  platform: z.enum([
    'MICROSOFT_TEAMS',
    'REST_API',
    'SERVER',
    'SLACK',
    'WEB',
    'GITHUB_COPILOT',
    'GITHUB_COPILOT_WEB',
    'GITHUB_COPILOT_IDE',
  ]).optional().describe('The UI platform from which the original chat message was sent.'),
  initiator: z.enum([
    'EVAL',
    'GLEAN',
    'HEALTH_CHECK',
    'ONBOARDING',
    'PRODUCTION_PROBE',
    'PROMPT_TEMPLATE',
    'RECOMMENDATION',
    'REST_API',
    'SUMMARIZE',
    'USER',
  ]).optional().describe('The means by which the chat request was initiated.'),
  feature: z.enum([
    'AI_ANSWER',
    'AI_FEED',
    'SUPPORT_NEXT_STEPS',
    'GLEAN_FOR_ENGINEERING',
    'DAILY_DIGESTS',
    'THREAD_SUMMARIZER',
    'GITHUB_PR_DESCRIPTION_GENERATOR',
  ]).optional().describe('The feature making the chat request, if applicable.'),
  uiTree: z.array(z.string()).optional().describe('The UI element tree associated with the event, if any.'),
  datasource: z.string().optional().describe('The datasource associated with the chat request, if applicable.'),
  searchRequestToken: z.string().optional().describe('The trackingToken from the search request that initiated the chat request, if applicable.'),
  hasCopyPaste: z.boolean().optional().describe('Whether the associated chat message has copy-pasted content.'),
  isDebug: z.boolean().optional().describe('Whether the request is for debugging purposes.'),
});

/**
 * Schema for runworkflow request parameters.
 */
export const RunWorkflowSchema = z.object({
  workflowId: z.string().optional().describe('The ID of the workflow to be triggered. Has precedence over the schema.'),
  fields: WorkflowInputFieldValuesSchema.optional(),
  stream: z.boolean().optional().describe('Whether to stream responses as they become available. If false, the entire response will be returned at once.'),
});

/**
 * Runs a workflow with the given parameters.
 *
 * @param {z.infer<typeof RunWorkflowSchema>} params - The workflow parameters
 * @param {string} [params.workflowId] - ID of the workflow to run
 * @param {Object} [params.schema] - Schema for an unsaved workflow
 * @param {Object} [params.fields] - Input field values for the workflow
 * @param {boolean} [params.stream] - Whether to stream the response
 * @returns {Promise<object>} The workflow execution response
 * @throws {Error} If the workflow request fails
 */
export async function runWorkflow(params: z.infer<typeof RunWorkflowSchema>) {
  const parsedParams = RunWorkflowSchema.parse(params);
  const client = getClient();

  return await client.runWorkflow(parsedParams);
}

/**
 * Formats workflow execution responses into a human-readable text format.
 *
 * @param {any} workflowResponse - The raw workflow response from Glean API
 * @returns {string} Formatted workflow response as text
 */
export function formatResponse(workflowResponse: any): string {
  if (
    !workflowResponse ||
    !workflowResponse.messages ||
    !Array.isArray(workflowResponse.messages) ||
    workflowResponse.messages.length === 0
  ) {
    return 'No response received.';
  }

  const formattedMessages = workflowResponse.messages
    .map((message: any) => {
      const author = message.author || 'Unknown';

      let messageText = '';

      if (message.fragments && Array.isArray(message.fragments)) {
        messageText = message.fragments
          .map((fragment: any) => {
            if (fragment.text) {
              return fragment.text;
            } else if (fragment.querySuggestion) {
              return `Query: ${fragment.querySuggestion.query}`;
            } else if (
              fragment.structuredResults &&
              Array.isArray(fragment.structuredResults)
            ) {
              return fragment.structuredResults
                .map((result: any) => {
                  if (result.document) {
                    const doc = result.document;

                    return `Document: ${doc.title || 'Untitled'} (${
                      doc.url || 'No URL'
                    })`;
                  }

                  return '';
                })
                .filter(Boolean)
                .join('\n');
            }

            return '';
          })
          .filter(Boolean)
          .join('\n');
      }

      let citationsText = '';
      if (
        message.citations &&
        Array.isArray(message.citations) &&
        message.citations.length > 0
      ) {
        citationsText =
          '\n\nSources:\n' +
          message.citations
            .map((citation: any, index: number) => {
              const sourceDoc = citation.sourceDocument || {};
              const title = sourceDoc.title || 'Unknown source';
              const url = sourceDoc.url || '';
              return `[${index + 1}] ${title} - ${url}`;
            })
            .join('\n');
      }

      const messageType = message.messageType
        ? ` (${message.messageType})`
        : '';
      const stepId = message.stepId ? ` [Step: ${message.stepId}]` : '';

      return `${author}${messageType}${stepId}: ${messageText}${citationsText}`;
    })
    .join('\n\n');

  return formattedMessages;
}

/**
 * Schema for workflow listing request parameters.
 */
export const ListWorkflowsSchema = z.object({
  includeHidden: z.boolean().optional().describe('Whether to include hidden workflows in the listing.'),
  includeSchemas: z.boolean().optional().describe('Whether to include full schemas in the response.'),
  limit: z.number().optional().describe('Maximum number of workflows to return.'),
  offset: z.number().optional().describe('Offset for pagination.'),
});

/**
 * Schema for getting a specific workflow by ID.
 */
export const GetWorkflowSchema = z.object({
  workflowId: z.string().describe('The ID of the workflow to retrieve.'),
  includeSchema: z.boolean().optional().describe('Whether to include the full workflow schema in the response.'),
});

/**
 * Lists available workflows with optional filtering.
 *
 * @param {z.infer<typeof ListWorkflowsSchema>} params - Optional listing parameters
 * @returns {Promise<object>} List of available workflows
 * @throws {Error} If the request fails
 */
export async function listWorkflows(params: z.infer<typeof ListWorkflowsSchema> = {}) {
  const parsedParams = ListWorkflowsSchema.parse(params);
  const client = getClient(true); // Use internal API

  return await client.listWorkflows(parsedParams);
}

/**
 * Gets a specific workflow by its ID.
 *
 * @param {z.infer<typeof GetWorkflowSchema>} params - Parameters with workflow ID
 * @returns {Promise<object>} The workflow details
 * @throws {Error} If the request fails
 */
export async function getWorkflow(params: z.infer<typeof GetWorkflowSchema>) {
  const parsedParams = GetWorkflowSchema.parse(params);
  const client = getClient(true); // Use internal API

  return await client.getWorkflow(parsedParams.workflowId);
}

/**
 * Formats workflow listing response into a human-readable text format.
 *
 * @param {any} response - The raw response from listWorkflows API
 * @returns {string} Formatted workflow listing as text
 */
export function formatListWorkflowsResponse(response: any): string {
  if (!response || !response.workflows || !Array.isArray(response.workflows) || response.workflows.length === 0) {
    return 'No workflows available.';
  }

  return response.workflows
    .map((workflow: any) => {
      const id = workflow.workflow.id || 'Unknown ID';
      const name = workflow.workflow.name || 'Unnamed Workflow';

      return `Agent: ${name} \n (WorkflowId: ${id})
${workflow.hidden ? 'Status: Hidden' : 'Status: Visible'}
--------------------------`;
    })
    .join('\n\n');
}

/**
 * Formats a single workflow response into a human-readable text format.
 *
 * @param {any} workflow - The raw workflow response from getWorkflow API
 * @returns {string} Formatted workflow details as text
 */
export function formatGetWorkflowResponse(workflow: any): string {
  if (!workflow || !workflow.workflowResult.workflow.id) {
    return 'Workflow not found.';
  }

  const workflowResult = workflow.workflowResult.workflow
  const id = workflowResult.id || 'Unknown ID';
  const name = workflowResult.name || 'Unnamed Workflow';

  let formattedResponse = `Workflow: ${name} (ID: ${id})
${workflowResult.hidden ? 'Status: Hidden' : 'Status: Visible'}`;

  if (workflowResult.schema) {
    formattedResponse += '\n\nSchema Information:';
    
    if (workflowResult.schema.goal) {
      formattedResponse += `\nGoal: ${workflowResult.schema.goal}`;
    }
    
    if (workflowResult.schema.fields && Array.isArray(workflowResult.schema.fields)) {
      formattedResponse += `\nInput Fields: ${workflowResult.schema.fields.length}`;

      workflowResult.schema.fields.forEach((field: any) => {
        formattedResponse += `\n  ${field.displayName || field.name}${field.optional ? ' (Optional)' : ' (Required)'}`;
      });
    }
  }

  return formattedResponse;
} 