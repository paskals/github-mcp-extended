#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { Octokit } from '@octokit/rest';

// Check for GitHub token
const GITHUB_TOKEN = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
if (!GITHUB_TOKEN) {
  throw new Error('GITHUB_PERSONAL_ACCESS_TOKEN environment variable is required');
}

// Initialize Octokit with the GitHub token
const octokit = new Octokit({
  auth: GITHUB_TOKEN
});

// Define milestone tool schemas
const listMilestonesSchema = {
  type: 'object',
  properties: {
    owner: {
      type: 'string',
      description: 'Repository owner (username or organization)'
    },
    repo: {
      type: 'string',
      description: 'Repository name'
    },
    state: {
      type: 'string',
      enum: ['open', 'closed', 'all'],
      description: 'Filter milestones by state'
    },
    sort: {
      type: 'string',
      enum: ['due_on', 'completeness'],
      description: 'Sort milestones by due date or completion'
    },
    direction: {
      type: 'string',
      enum: ['asc', 'desc'],
      description: 'Sort direction'
    },
    per_page: {
      type: 'number',
      description: 'Results per page (max 100)'
    },
    page: {
      type: 'number',
      description: 'Page number for pagination'
    }
  },
  required: ['owner', 'repo'],
  additionalProperties: false
};

const getMilestoneSchema = {
  type: 'object',
  properties: {
    owner: {
      type: 'string',
      description: 'Repository owner (username or organization)'
    },
    repo: {
      type: 'string',
      description: 'Repository name'
    },
    milestone_number: {
      type: 'number',
      description: 'The milestone number'
    }
  },
  required: ['owner', 'repo', 'milestone_number'],
  additionalProperties: false
};

const createMilestoneSchema = {
  type: 'object',
  properties: {
    owner: {
      type: 'string',
      description: 'Repository owner (username or organization)'
    },
    repo: {
      type: 'string',
      description: 'Repository name'
    },
    title: {
      type: 'string',
      description: 'The title of the milestone'
    },
    state: {
      type: 'string',
      enum: ['open', 'closed'],
      description: 'The state of the milestone'
    },
    description: {
      type: 'string',
      description: 'A description of the milestone'
    },
    due_on: {
      type: 'string',
      description: 'The milestone due date (ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ)'
    }
  },
  required: ['owner', 'repo', 'title'],
  additionalProperties: false
};

const updateMilestoneSchema = {
  type: 'object',
  properties: {
    owner: {
      type: 'string',
      description: 'Repository owner (username or organization)'
    },
    repo: {
      type: 'string',
      description: 'Repository name'
    },
    milestone_number: {
      type: 'number',
      description: 'The milestone number'
    },
    title: {
      type: 'string',
      description: 'The title of the milestone'
    },
    state: {
      type: 'string',
      enum: ['open', 'closed'],
      description: 'The state of the milestone'
    },
    description: {
      type: 'string',
      description: 'A description of the milestone'
    },
    due_on: {
      type: 'string',
      description: 'The milestone due date (ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ)'
    }
  },
  required: ['owner', 'repo', 'milestone_number'],
  additionalProperties: false
};

const deleteMilestoneSchema = {
  type: 'object',
  properties: {
    owner: {
      type: 'string',
      description: 'Repository owner (username or organization)'
    },
    repo: {
      type: 'string',
      description: 'Repository name'
    },
    milestone_number: {
      type: 'number',
      description: 'The milestone number'
    }
  },
  required: ['owner', 'repo', 'milestone_number'],
  additionalProperties: false
};

class GitHubMilestoneServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'github-milestone-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();

    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'list_milestones',
          description: 'List milestones in a GitHub repository with filtering options',
          inputSchema: listMilestonesSchema,
        },
        {
          name: 'get_milestone',
          description: 'Get details of a specific milestone in a GitHub repository',
          inputSchema: getMilestoneSchema,
        },
        {
          name: 'create_milestone',
          description: 'Create a new milestone in a GitHub repository',
          inputSchema: createMilestoneSchema,
        },
        {
          name: 'update_milestone',
          description: 'Update an existing milestone in a GitHub repository',
          inputSchema: updateMilestoneSchema,
        },
        {
          name: 'delete_milestone',
          description: 'Delete a milestone from a GitHub repository',
          inputSchema: deleteMilestoneSchema,
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'list_milestones':
            return await this.listMilestones(args);
          case 'get_milestone':
            return await this.getMilestone(args);
          case 'create_milestone':
            return await this.createMilestone(args);
          case 'update_milestone':
            return await this.updateMilestone(args);
          case 'delete_milestone':
            return await this.deleteMilestone(args);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error: unknown) {
        console.error(`Error executing tool ${name}:`, error);

        if (error instanceof McpError) {
          throw error;
        }

        // Handle Octokit errors
        if (typeof error === 'object' && error !== null && 'name' in error && error.name === 'HttpError') {
          // Check if the error has status and message properties
          const hasStatus = 'status' in error && typeof error.status === 'number';
          const hasMessage = 'message' in error && typeof error.message === 'string';

          const status = hasStatus ? String(error.status) : 'unknown';
          const message = hasMessage ? String(error.message) : 'Unknown error message';

          return {
            content: [
              {
                type: 'text',
                text: `GitHub API error: ${status} ${message}`,
              },
            ],
            isError: true,
          };
        }

        // Generic error handling
        const errorMessage = typeof error === 'object' && error !== null && 'message' in error
          ? String(error.message)
          : 'Unknown error';

        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  // Tool implementations
  private async listMilestones(args: any) {
    const { owner, repo, state, sort, direction, per_page, page } = args;

    const response = await octokit.issues.listMilestones({
      owner,
      repo,
      state,
      sort,
      direction,
      per_page,
      page,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async getMilestone(args: any) {
    const { owner, repo, milestone_number } = args;

    const response = await octokit.issues.getMilestone({
      owner,
      repo,
      milestone_number,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async createMilestone(args: any) {
    const { owner, repo, title, state, description, due_on } = args;

    const response = await octokit.issues.createMilestone({
      owner,
      repo,
      title,
      state,
      description,
      due_on,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async updateMilestone(args: any) {
    const { owner, repo, milestone_number, title, state, description, due_on } = args;

    const response = await octokit.issues.updateMilestone({
      owner,
      repo,
      milestone_number,
      title,
      state,
      description,
      due_on,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async deleteMilestone(args: any) {
    const { owner, repo, milestone_number } = args;

    await octokit.issues.deleteMilestone({
      owner,
      repo,
      milestone_number,
    });

    return {
      content: [
        {
          type: 'text',
          text: `Successfully deleted milestone #${milestone_number} from ${owner}/${repo}`,
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('GitHub Milestone MCP server running on stdio');
  }
}

// Start the server
const server = new GitHubMilestoneServer();
server.run().catch(console.error);
