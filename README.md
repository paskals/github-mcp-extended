# GitHub Milestone MCP Server

A custom Model Context Protocol (MCP) server for GitHub API operations not included in the official GitHub MCP. This server currently focuses on milestone management operations with plans to expand to issues and projects management in the future.

## Features

Currently implements CRUD operations for GitHub milestones:

- `list_milestones`: List milestones in a repository with filtering options
- `get_milestone`: Get details of a specific milestone
- `create_milestone`: Create a new milestone in a repository
- `update_milestone`: Update an existing milestone
- `delete_milestone`: Delete a milestone from a repository

## Future Plans

- Add endpoints for issues management
- Add endpoints for projects management
- Additional GitHub API features not covered by the official GitHub MCP

## Prerequisites

- Node.js (v16+)
- GitHub Personal Access Token with appropriate permissions

## Installation

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd github-server-milestone
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the server:
   ```bash
   npm run build
   ```

## Configuration

Before running the server, you need to set your GitHub Personal Access Token:

```bash
export GITHUB_PERSONAL_ACCESS_TOKEN=your_github_token
```

To create a GitHub token:
1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate a new token with the following permissions:
   - `repo` for private repositories
   - `public_repo` for public repositories only

## Running the Server

Start the server with:

```bash
npm start
```

The server runs on stdio, making it compatible with MCP clients.

## Tool Usage Examples

### List Milestones

```json
{
  "name": "list_milestones",
  "arguments": {
    "owner": "octocat",
    "repo": "hello-world",
    "state": "open"
  }
}
```

### Create a Milestone

```json
{
  "name": "create_milestone",
  "arguments": {
    "owner": "octocat",
    "repo": "hello-world",
    "title": "v1.0 Release",
    "description": "First stable release",
    "due_on": "2023-12-31T23:59:59Z"
  }
}
```

### Get a Milestone

```json
{
  "name": "get_milestone",
  "arguments": {
    "owner": "octocat",
    "repo": "hello-world",
    "milestone_number": 1
  }
}
```

### Update a Milestone

```json
{
  "name": "update_milestone",
  "arguments": {
    "owner": "octocat",
    "repo": "hello-world",
    "milestone_number": 1,
    "state": "closed"
  }
}
```

### Delete a Milestone

```json
{
  "name": "delete_milestone",
  "arguments": {
    "owner": "octocat",
    "repo": "hello-world",
    "milestone_number": 1
  }
}
```

## Development

For development purposes, you can use:

```bash
npm run dev
```

This will compile TypeScript and run the server.
