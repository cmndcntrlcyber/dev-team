# MCP Configuration Guide

## 📋 Overview

This document describes the Model Context Protocol (MCP) integration for the dev-team platform and clarifies the role of MCP-Nexus in the architecture.

## 🏗️ Architecture Clarification

### What MCP-Nexus Actually Is

**MCP-Nexus** (`/home/cmndcntrl/code/MCP-Nexus`) is an **MCP Server Manager** - a web-based control panel for managing MCP server processes, edge devices, and monitoring. It is **NOT** an MCP protocol gateway or portal.

**MCP-Nexus Capabilities:**
- ✅ Server lifecycle management (start/stop/restart)
- ✅ Edge device registration and monitoring
- ✅ Certificate deployment
- ✅ Real-time monitoring and logs
- ✅ WebSocket-based UI updates

**MCP-Nexus Does NOT:**
- ❌ Implement MCP protocol SSE endpoints
- ❌ Act as authentication proxy for Cloudflare MCP
- ❌ Route MCP tool requests
- ❌ Provide MCP resources or tools

### Currently Configured MCP Servers

**Active MCP Servers:**
1. **Tavily Search** - Web search capabilities via Tavily AI API
2. **ProxmoxMCP** - Proxmox VE cluster management and VM operations
3. **Cloudflare MCP** - Official Cloudflare infrastructure management (Workers, KV, R2, D1, Pages, DNS)

**Previous Broken Entries (Removed):**
- The 5 individual direct-SSE Cloudflare MCP entries were removed due to architecture mismatch
- Now using the official `@cloudflare/mcp-server-cloudflare` package instead

## 🎯 Currently Configured MCP Servers

### 1. Tavily Search Server
- **Server Name:** `tavily`
- **Purpose:** Web search using Tavily AI search API
- **Type:** stdio
- **Command:** `node /home/cmndcntrl/Documents/Cline/MCP/tavily-server/build/index.js`
- **Authentication:** API Key required (configured in env)
- **Auto-approve:** `tavily_search` tool

**Key Capabilities:**
- Search the web with high-quality results
- Basic and advanced search depth options
- Domain filtering (include/exclude)
- Configurable result limits

**Example Usage:**
```javascript
await use_mcp_tool({
  server_name: "tavily",
  tool_name: "tavily_search",
  arguments: {
    query: "latest Node.js features",
    search_depth: "basic",
    max_results: 5
  }
});
```

### 2. ProxmoxMCP Server
- **Server Name:** `github.com/canvrno/ProxmoxMCP`
- **Purpose:** Proxmox VE cluster management and VM operations
- **Type:** stdio
- **Command:** Python module in virtual environment
- **Authentication:** Configured via proxmox-config/config.json

**Key Capabilities:**
- Get cluster nodes and status
- List and manage VMs
- Execute commands in VMs via QEMU guest agent
- Manage storage pools
- Check cluster health

**Example Usage:**
```javascript
await use_mcp_tool({
  server_name: "github.com/canvrno/ProxmoxMCP",
  tool_name: "get_vms",
  arguments: {}
});
```

## 🔧 Cloudflare MCP Server

### 3. Cloudflare Infrastructure Server
- **Server Name:** `@cloudflare/mcp-server-cloudflare`
- **Purpose:** Comprehensive Cloudflare infrastructure management
- **Type:** stdio (npx package)
- **Command:** `npx -y @cloudflare/mcp-server-cloudflare`
- **Authentication:** API Token + Account ID

**Key Capabilities:**

**Workers Management:**
- Deploy and update Workers
- List and manage Workers
- View logs and metrics

**KV Namespace Operations:**
- Create/delete KV namespaces
- Read/write KV entries
- List namespaces and keys

**R2 Bucket Management:**
- Create/delete R2 buckets
- Upload/download objects
- List buckets and manage objects

**D1 Database Operations:**
- Create/manage D1 databases
- Execute SQL queries
- Manage schemas and migrations

**Pages Deployment:**
- Deploy to Cloudflare Pages
- Manage deployments and rollbacks
- View deployment logs

**DNS Management:**
- Add/update/delete DNS records
- List zones and records
- Manage DNS configurations

### Example Usage

```javascript
// List all KV namespaces
await use_mcp_tool({
  server_name: "@cloudflare/mcp-server-cloudflare",
  tool_name: "list_kv_namespaces",
  arguments: {
    account_id: "27e1b1a898bcee51303504e20ac5d743"
  }
});

// Create a new KV namespace
await use_mcp_tool({
  server_name: "@cloudflare/mcp-server-cloudflare",
  tool_name: "create_kv_namespace",
  arguments: {
    account_id: "27e1b1a898bcee51303504e20ac5d743",
    title: "my-application-cache"
  }
});

// List R2 buckets
await use_mcp_tool({
  server_name: "@cloudflare/mcp-server-cloudflare",
  tool_name: "list_r2_buckets",
  arguments: {
    account_id: "27e1b1a898bcee51303504e20ac5d743"
  }
});
```

### 4. Chrome DevTools MCP Server
- **Server Name:** `chrome-devtools`
- **Purpose:** Browser automation, debugging, and UI/UX testing
- **Type:** stdio (npx package)
- **Command:** `npx -y chrome-devtools-mcp --browser-url=http://localhost:9222`
- **Authentication:** None (local Chrome connection)

**Prerequisites:**
- Chrome/Chromium installed
- Chrome running with remote debugging on port 9222
- Use `/home/cmndcntrl/code/dev-team/scripts/chrome-launcher.sh start`

**Key Capabilities:**

**Navigation & Control (6 tools):**
- Navigate pages, open/close tabs, switch between pages
- Wait for content, list all open pages

**Inspection (6 tools):**
- Take DOM snapshots with accessibility info
- Capture screenshots (full page or element-specific)
- List console messages (filter by type: log, error, warning)
- Monitor network requests and responses

**Interaction (8 tools):**
- Click, hover, drag elements
- Fill forms, upload files
- Press keyboard keys
- Handle dialogs (alert, confirm, prompt)

**Performance Analysis (3 tools):**
- Start/stop performance traces
- Analyze Core Web Vitals (LCP, FCP, TTI, TBT, CLS)
- Generate performance insights

**Device Emulation (2 tools):**
- Resize viewport for responsive testing
- Emulate devices, network conditions, geolocation

### Example Usage

```javascript
// Start Chrome first
// /home/cmndcntrl/code/dev-team/scripts/chrome-launcher.sh start

// Debug console errors
await use_mcp_tool({
  server_name: "chrome-devtools",
  tool_name: "cgIazK0mcp0navigate_page",
  arguments: { url: "http://localhost:3000" }
});

await use_mcp_tool({
  server_name: "chrome-devtools",
  tool_name: "cgIazK0mcp0list_console_messages",
  arguments: { types: ["error"] }
});

// Performance analysis
await use_mcp_tool({
  server_name: "chrome-devtools",
  tool_name: "cgIazK0mcp0performance_start_trace",
  arguments: { reload: true, autoStop: false }
});

await use_mcp_tool({
  server_name: "chrome-devtools",
  tool_name: "cgIazK0mcp0performance_stop_trace",
  arguments: {}
});

// Take screenshot
await use_mcp_tool({
  server_name: "chrome-devtools",
  tool_name: "cgIazK0mcp0take_screenshot",
  arguments: { fullPage: true, format: "png" }
});
```

## 🤖 Agent Integration Matrix

| Agent | Primary MCP Servers | Use Cases |
|-------|-------------------|-----------|
| **All Agents** | Tavily | Web research, documentation lookup, latest information |
| **Architecture Lead** | Cloudflare, Tavily | Infrastructure design, Workers/KV/R2/D1 setup, best practices |
| **DevOps Engineer** | Cloudflare, ProxmoxMCP, Chrome DevTools | Deployments, DNS, VM ops, production health checks |
| **Backend Integration** | Cloudflare, ProxmoxMCP | Workers APIs, D1 databases, KV storage, VM commands |
| **Frontend Core** | Cloudflare, Chrome DevTools | Pages deployment, UI debugging, responsive testing |
| **QA Agent** | Tavily, Cloudflare, Chrome DevTools | E2E testing, visual regression, accessibility checks |
| **MCP Integration** | All servers | Cross-platform orchestration, unified infrastructure control |

## 🔐 Authentication Configuration

### Environment Variables

All authentication is managed through environment variables in `.env`:

```bash
# Account Configuration
CF_ACCOUNT_ID=27e1b1a898bcee51303504e20ac5d743

# API Tokens
CF_API_TOKEN_WORKERS_AI=4EIU06w0pi0eoFxSV94hLtSZRxKuQwqhVibuES64
CF_API_TOKEN_R2=Qg5O3v4BBrOi0TYoJs0Fj4Sw72-aBeO4QTbc5j5C
CF_API_TOKEN_D1=uG4LbP0w5O5Chlb22npkfcZvLiEMrEqNnGxTiIkw
CF_TOKEN_C3S_NEXUS=10I7G0T2INllodt4SVWoRRyWddAzMpmBq_IyNb4v

# Cloudflare Access
CF_ACCESS_AUD_OFFSEC=944b3825479694719c68721c1b8ba342d93dc720b899863077e4f8531b2bd74e
CF_ACCESS_AUD_RESEARCH=bd657082ae913c648b34e76b7b3d3a9a7d7eab390a4b159e5afb1e5f8d601d39
CF_ACCESS_JWK_URL=https://c3s.cloudflareaccess.com/cdn-cgi/access/certs
```

### Current Cline MCP Settings

The MCP configuration is stored in `~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`:

```json
{
  "mcpServers": {
    "tavily": {
      "autoApprove": ["tavily_search"],
      "disabled": false,
      "timeout": 60,
      "type": "stdio",
      "command": "node",
      "args": [
        "/home/cmndcntrl/Documents/Cline/MCP/tavily-server/build/index.js"
      ],
      "env": {
        "TAVILY_API_KEY": "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"
      }
    },
    "github.com/canvrno/ProxmoxMCP": {
      "autoApprove": [],
      "disabled": false,
      "timeout": 60,
      "type": "stdio",
      "command": "/home/cmndcntrl/Documents/Cline/MCP/ProxmoxMCP/.venv/bin/python",
      "args": ["-m", "proxmox_mcp.server"],
      "cwd": "/home/cmndcntrl/Documents/Cline/MCP/ProxmoxMCP",
      "env": {
        "PYTHONPATH": "/home/cmndcntrl/Documents/Cline/MCP/ProxmoxMCP/src",
        "PROXMOX_MCP_CONFIG": "/home/cmndcntrl/Documents/Cline/MCP/ProxmoxMCP/proxmox-config/config.json",
        "LOG_LEVEL": "DEBUG"
      }
    },
    "@cloudflare/mcp-server-cloudflare": {
      "command": "npx",
      "args": ["-y", "@cloudflare/mcp-server-cloudflare"],
      "env": {
        "CLOUDFLARE_API_TOKEN": "10I7G0T2INllodt4SVWoRRyWddAzMpmBq_IyNb4v",
        "CLOUDFLARE_ACCOUNT_ID": "27e1b1a898bcee51303504e20ac5d743"
      },
      "autoApprove": [],
      "disabled": false,
      "timeout": 60,
      "type": "stdio"
    }
  }
}
```

## 🚀 Usage Examples

### Example 1: Web Research with Tavily

```javascript
// Research latest best practices
const results = await use_mcp_tool({
  server_name: "tavily",
  tool_name: "tavily_search",
  arguments: {
    query: "Node.js microservices best practices 2025",
    search_depth: "advanced",
    max_results: 10
  }
});

// Process results
results.forEach(result => {
  console.log(`${result.title}: ${result.url}`);
  console.log(result.content);
});
```

### Example 2: Proxmox VM Management

```javascript
// Check cluster health
const nodes = await use_mcp_tool({
  server_name: "github.com/canvrno/ProxmoxMCP",
  tool_name: "get_nodes",
  arguments: {}
});

// Get all VMs
const vms = await use_mcp_tool({
  server_name: "github.com/canvrno/ProxmoxMCP",
  tool_name: "get_vms",
  arguments: {}
});

// Execute command in specific VM
const result = await use_mcp_tool({
  server_name: "github.com/canvrno/ProxmoxMCP",
  tool_name: "execute_vm_command",
  arguments: {
    node: "pve1",
    vmid: "100",
    command: "systemctl status nginx"
  }
});
```

### Example 3: Combined Research and Infrastructure

```javascript
// Research then implement
const research = await use_mcp_tool({
  server_name: "tavily",
  tool_name: "tavily_search",
  arguments: {
    query: "Docker container optimization techniques",
    search_depth: "advanced"
  }
});

// Apply findings to Proxmox VMs
const vmStatus = await use_mcp_tool({
  server_name: "github.com/canvrno/ProxmoxMCP",
  tool_name: "execute_vm_command",
  arguments: {
    node: "pve1",
    vmid: "100",
    command: "docker stats --no-stream"
  }
});
```

## 🔧 Setup Instructions

### Verifying Current Configuration

1. **Check MCP Status in Cline:**
   - Open VS Code with Cline extension
   - Look for "Connected MCP Servers" section
   - Should show: Tavily ✅ and ProxmoxMCP ✅

2. **Test MCP Tools:**
   ```bash
   # If you have a test script
   node scripts/test-mcp-connection.js
   ```

### Adding New MCP Servers

To add additional MCP servers:

1. **Edit settings file:**
   ```bash
   code ~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
   ```

2. **Add server configuration:**
   - Follow the format of existing entries
   - Specify command, args, and env variables
   - Set timeout and type appropriately

3. **Restart VS Code/Cline:**
   - Close and reopen VS Code
   - Check MCP status panel for new server

## 🐛 Troubleshooting

### Common Issues

#### 1. "Server Not Connected" Error

**Cause:** MCP server process failed to start or crashed

**Solution:**
- Check the command and args are correct in settings
- Verify file paths exist (especially for tavily-server)
- Check environment variables are set properly
- Look for error logs in VS Code developer console

#### 2. "Tool Not Found" Error

**Cause:** Trying to use a tool from a server that's not configured

**Solution:**
- Verify the server_name matches exactly (case-sensitive)
- Check the server is listed in connected MCP servers
- Confirm the tool name is correct for that server

#### 3. Python Module Not Found (ProxmoxMCP)

**Cause:** Virtual environment or Python path issues

**Solution:**
- Verify venv exists: `/home/cmndcntrl/Documents/Cline/MCP/ProxmoxMCP/.venv`
- Check PYTHONPATH is set correctly in config
- Ensure proxmox_mcp module is installed in venv

#### 4. Tavily API Errors

**Cause:** API key issues or rate limiting

**Solution:**
- Verify TAVILY_API_KEY is valid and not expired
- Check Tavily API quota/limits
- Ensure search parameters are within allowed ranges

### Debug Mode

Enable debug logging:

```bash
# In .env
LOG_LEVEL=debug
CF_MCP_DEBUG=true
```

View MCP connection logs:
```bash
# Check Cline logs in VS Code
# Look for MCP connection status messages
```

## 📚 Additional Resources

- [Cloudflare MCP Documentation](https://developers.cloudflare.com/agents/model-context-protocol/)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare Access Documentation](https://developers.cloudflare.com/cloudflare-one/)

## 🔄 Updates and Maintenance

### Adding New MCP Servers

To add additional Cloudflare MCP servers:

1. Identify the server URL from [Cloudflare's MCP catalog](https://developers.cloudflare.com/agents/model-context-protocol/mcp-servers-for-cloudflare/)
2. Add to your MCP portal in Cloudflare dashboard
3. No changes needed to `cline_mcp_settings.json` (portal handles all servers)
4. Update this documentation with new server capabilities

### Token Rotation

Rotate API tokens quarterly:

1. Generate new tokens in Cloudflare dashboard
2. Update `.env` file
3. Restart development environment
4. Verify connectivity

## 📊 Monitoring

### Track MCP Usage

Monitor MCP tool usage in your application:

```javascript
// Log all MCP tool calls
function logMCPUsage(serverName, toolName, duration) {
  console.log({
    timestamp: new Date().toISOString(),
    server: serverName,
    tool: toolName,
    duration_ms: duration,
    status: 'success'
  });
}
```

### Performance Metrics

Key metrics to track:
- MCP tool call success rate
- Average response time
- Error rate by server
- Most used tools
- Authentication failures

---

**Last Updated:** January 10, 2025  
**Configuration Version:** 2.1 (Cloudflare MCP Added)  
**Author:** Dev Team Platform

## 📝 Change History

### Version 2.1 (January 10, 2025)
- ✅ Added official Cloudflare MCP server (`@cloudflare/mcp-server-cloudflare`)
- ✅ Now supports Workers, KV, R2, D1, Pages, and DNS management
- ✅ Full Cloudflare infrastructure control via proper MCP integration

### Version 2.0 (January 10, 2025)
- ✅ Removed broken Cloudflare MCP entries (5 direct-SSE servers)
- ✅ Corrected MCP-Nexus role (server manager, not portal)
- ✅ Updated documentation to reflect actual architecture
- ✅ Simplified to working servers only (Tavily + ProxmoxMCP)

### Version 1.0 (January 6, 2025)
- ❌ Incorrect Cloudflare portal architecture (removed)
- ❌ MCP-Nexus mischaracterized as MCP gateway (corrected)
