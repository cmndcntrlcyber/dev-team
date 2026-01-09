# Supabase MCP Server Setup

## Overview
The Supabase MCP server has been successfully configured to connect your Supabase projects to Cline and other AI assistants.

## Configuration Details

**Server Name:** `github.com/supabase-community/supabase-mcp`  
**Type:** HTTP-based MCP server (no local installation required)  
**URL:** `https://mcp.supabase.com/mcp?read_only=true`

### Security Settings Applied

✅ **Read-Only Mode:** Enabled (`read_only=true`)
- Prevents write operations on databases
- All SQL queries execute as read-only Postgres user
- Mutating tools are disabled (apply_migration, create_project, etc.)

✅ **No Auto-Approve:** All tool calls require manual approval

⚠️ **Not Project-Scoped:** Server has access to all projects in your Supabase organization
- To scope to a specific project, add `&project_ref=<your-project-id>` to the URL

## Authentication

The server uses OAuth 2.1 for authentication. When Cline/VS Code restarts, you'll be prompted to:
1. Log in to your Supabase account
2. Choose the organization containing your projects
3. Grant permissions to the MCP server

## Available Tools

The server provides these tool groups (all enabled by default):

### Account Tools
- `list_projects` - List all Supabase projects
- `get_project` - Get project details
- `list_organizations` - List organizations you're a member of
- `get_organization` - Get organization details

### Database Tools (Read-Only)
- `list_tables` - List tables in specified schemas
- `list_extensions` - List database extensions
- `list_migrations` - List migrations
- `execute_sql` - Execute read-only SQL queries
- `apply_migration` - ❌ Disabled in read-only mode

### Knowledge Base Tools
- `search_docs` - Search Supabase documentation

### Debugging Tools
- `get_logs` - Get logs by service type (api, postgres, functions, auth, storage, realtime)
- `get_advisors` - Get security/performance advisory notices

### Development Tools
- `get_project_url` - Get API URL for a project
- `get_publishable_keys` - Get anonymous API keys
- `generate_typescript_types` - Generate TypeScript types from schema

### Edge Functions Tools
- `list_edge_functions` - List all Edge Functions
- `get_edge_function` - Retrieve function file contents
- `deploy_edge_function` - ❌ Disabled in read-only mode

### Branching Tools (Experimental - Requires Paid Plan)
- `list_branches` - List development branches
- `create_branch` - ❌ Disabled in read-only mode
- `delete_branch` - ❌ Disabled in read-only mode
- `merge_branch` - ❌ Disabled in read-only mode
- `reset_branch` - ❌ Disabled in read-only mode
- `rebase_branch` - ❌ Disabled in read-only mode

### Storage Tools (Disabled by Default)
- To enable, add `&features=storage` to URL
- `list_storage_buckets`
- `get_storage_config`
- `update_storage_config`

## Usage Examples

Once authenticated, you can command Cline to:

```
"Search Supabase docs for how to set up row level security"
"List all my Supabase projects"
"Show me the tables in my database"
"Execute a query to count users"
"Generate TypeScript types for my database"
"Get the logs for my API service"
```

## Customization Options

### Enable Write Operations
⚠️ **Not Recommended** - To enable write operations, change the URL to:
```
https://mcp.supabase.com/mcp
```

### Scope to Specific Project
📌 **Recommended** - To limit access to one project:
```
https://mcp.supabase.com/mcp?read_only=true&project_ref=<your-project-id>
```

Find your project ID in: Supabase Dashboard → Project Settings → General → Project ID

### Enable Only Specific Features
Limit tool groups with the `features` parameter:
```
https://mcp.supabase.com/mcp?read_only=true&features=database,docs
```

Available groups: `account`, `docs`, `database`, `debugging`, `development`, `functions`, `branching`, `storage`

## Security Best Practices

Following Supabase's recommendations:

1. ✅ **Read-only mode enabled** - Prevents accidental data modifications
2. ⚠️ **Consider project scoping** - Limit to specific project if possible
3. ✅ **No auto-approve** - Manual review of all tool calls required
4. 🔒 **Use with development projects** - Not recommended for production data
5. 🔒 **Not for customers** - This is a developer tool, operates under your permissions

## Troubleshooting

### Server Not Connecting
- Restart VS Code/Cline to trigger authentication flow
- Check that you have active internet connection
- Verify you're logged into Supabase in your browser

### OAuth Flow Not Starting
- Close and reopen VS Code
- Check Cline's MCP settings are saved correctly
- Look for authentication prompts in VS Code notifications

### Tools Not Available
- Confirm authentication was successful
- Check that `disabled: false` in MCP settings
- Verify you have projects in your Supabase organization

## Configuration File Location

The MCP settings are stored at:
```
/home/cmndcntrl/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
```

## Resources

- [Supabase MCP Documentation](https://supabase.com/docs/guides/getting-started/mcp)
- [Model Context Protocol](https://modelcontextprotocol.io/introduction)
- [GitHub Repository](https://github.com/supabase-community/supabase-mcp)
- [Security Best Practices](https://github.com/supabase-community/supabase-mcp#security-risks)

---

**Setup Date:** December 17, 2025  
**Configuration:** Read-only, no project scoping, all default feature groups enabled
