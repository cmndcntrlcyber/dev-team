# Cloudflare MCP Configuration Guide

## 📋 Overview

This document describes the Cloudflare Model Context Protocol (MCP) integration for the dev-team platform. MCP enables AI agents to interact with Cloudflare's suite of services through standardized tools and resources.

## 🔗 Direct MCP Server Connections

This configuration uses **direct connections** to Cloudflare's hosted MCP servers. Each server is accessed individually through its own endpoint, without requiring an MCP portal.

**Configured Servers:**
- **Workers Bindings:** `https://bindings.mcp.cloudflare.com/sse`
- **Browser Rendering:** `https://browser.mcp.cloudflare.com/sse`
- **Documentation:** `https://docs.mcp.cloudflare.com/sse`
- **Observability:** `https://observability.mcp.cloudflare.com/sse`
- **Workers Builds:** `https://builds.mcp.cloudflare.com/sse`

Each server handles its own authentication via OAuth and Cloudflare API tokens.

## 🎯 Available MCP Servers

### Critical Priority Servers

#### 1. Workers Bindings Server
- **URL:** `https://bindings.mcp.cloudflare.com/sse`
- **Purpose:** Manage Workers AI, KV namespaces, R2 buckets, D1 databases, and Durable Objects
- **Authentication:** Required (OAuth + API Token)
- **Used By:** Architecture Lead, Backend Integration, MCP Integration agents

**Key Capabilities:**
- Create and manage KV namespaces
- Configure R2 bucket bindings
- Set up D1 database connections
- Manage Durable Object bindings
- Configure Workers AI bindings

**Example Usage:**
```javascript
// List all KV namespaces
await use_mcp_tool({
  server_name: "github.com/cloudflare/mcp-server-cloudflare",
  tool_name: "list_kv_namespaces",
  arguments: {
    account_id: process.env.CF_ACCOUNT_ID
  }
});
```

#### 2. Browser Rendering Server
- **URL:** `https://browser.mcp.cloudflare.com/sse`
- **Purpose:** Web page rendering, screenshots, browser automation, markdown conversion
- **Authentication:** Required (OAuth)
- **Used By:** Frontend Core, QA, DevOps agents

**Key Capabilities:**
- Fetch and render web pages
- Convert HTML to markdown
- Take screenshots of URLs
- Execute browser automation scripts
- Validate responsive designs

**Example Usage:**
```javascript
// Take screenshot of a webpage
await use_mcp_tool({
  server_name: "github.com/cloudflare/mcp-server-cloudflare",
  tool_name: "screenshot",
  arguments: {
    url: "https://example.com",
    viewport: { width: 1280, height: 800 }
  }
});
```

#### 3. Documentation Server
- **URL:** `https://docs.mcp.cloudflare.com/sse`
- **Purpose:** Access up-to-date Cloudflare documentation
- **Authentication:** Not required
- **Used By:** All agents (for reference)

**Key Capabilities:**
- Search Cloudflare documentation
- Get API reference information
- Access code examples
- Find best practices

### High Priority Servers

#### 4. Observability Server
- **URL:** `https://observability.mcp.cloudflare.com/sse`
- **Purpose:** Access logs, analytics, and debugging information
- **Authentication:** Required (OAuth + API Token)
- **Used By:** DevOps, QA, Backend Integration agents

**Key Capabilities:**
- Query application logs
- Access analytics data
- Monitor Workers metrics
- Debug production issues
- Track error rates

#### 5. Workers Builds Server
- **URL:** `https://builds.mcp.cloudflare.com/sse`
- **Purpose:** CI/CD pipeline insights and build management
- **Authentication:** Required (OAuth + API Token)
- **Used By:** DevOps, Architecture Lead agents

**Key Capabilities:**
- Monitor build status
- Access deployment logs
- Track build history
- Manage deployments
- Rollback builds

## 🤖 Agent Integration Matrix

| Agent | Primary MCP Servers | Use Cases |
|-------|-------------------|-----------|
| **Architecture Lead** | Workers Bindings, Documentation | Infrastructure design, binding configuration, architecture documentation |
| **Frontend Core** | Browser Rendering, Documentation | Visual testing, screenshot validation, responsive design checks |
| **Backend Integration** | Workers Bindings, Observability | KV/R2/D1 management, API debugging, performance monitoring |
| **QA Agent** | Browser Rendering, Observability | E2E testing, visual regression, log analysis |
| **DevOps Engineer** | Workers Builds, Observability | CI/CD monitoring, deployment tracking, infrastructure logs |
| **MCP Integration** | All servers | Tool orchestration, cross-service coordination |

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

### Cline MCP Settings

The MCP portal is configured in `~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`:

```json
{
  "mcpServers": {
    "github.com/cloudflare/mcp-server-cloudflare": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.c3s.nexus/sse"],
      "env": {
        "CF_API_TOKEN": "10I7G0T2INllodt4SVWoRRyWddAzMpmBq_IyNb4v",
        "CF_ACCOUNT_ID": "27e1b1a898bcee51303504e20ac5d743"
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

### Example 1: Deploy Workers Application with Bindings

```javascript
// Architecture Lead Agent workflow
const deploymentConfig = {
  bindings: {
    kv: ["USER_SESSIONS", "API_CACHE"],
    r2: ["STATIC_ASSETS"],
    d1: ["APPLICATION_DB"],
    ai: ["WORKERS_AI"]
  }
};

// Use MCP to configure bindings
for (const kv of deploymentConfig.bindings.kv) {
  await use_mcp_tool({
    server_name: "github.com/cloudflare/mcp-server-cloudflare",
    tool_name: "create_kv_namespace",
    arguments: {
      account_id: process.env.CF_ACCOUNT_ID,
      title: kv
    }
  });
}
```

### Example 2: Visual Regression Testing

```javascript
// QA Agent workflow
const testUrls = [
  "http://localhost:3000",
  "http://localhost:3000/dashboard",
  "http://localhost:3000/projects"
];

for (const url of testUrls) {
  const screenshot = await use_mcp_tool({
    server_name: "github.com/cloudflare/mcp-server-cloudflare",
    tool_name: "screenshot",
    arguments: {
      url,
      viewport: { width: 1920, height: 1080 },
      full_page: true
    }
  });
  
  // Compare with baseline
  await compareScreenshots(screenshot, baseline);
}
```

### Example 3: Production Debugging

```javascript
// DevOps Agent workflow
// Check recent errors in logs
const logs = await use_mcp_tool({
  server_name: "github.com/cloudflare/mcp-server-cloudflare",
  tool_name: "query_logs",
  arguments: {
    worker_name: "dev-team-api",
    time_range: "1h",
    level: "error"
  }
});

// Analyze error patterns
const errorAnalysis = analyzeLogs(logs);

// If critical, trigger rollback
if (errorAnalysis.criticalErrors > 10) {
  await use_mcp_tool({
    server_name: "github.com/cloudflare/mcp-server-cloudflare",
    tool_name: "rollback_deployment",
    arguments: {
      worker_name: "dev-team-api",
      version: "previous"
    }
  });
}
```

## 🔧 Setup Instructions

### Step 1: Configure MCP Portal in Cloudflare

1. Navigate to **Cloudflare Zero Trust** dashboard
2. Go to **Access** → **Applications** → **AI controls** → **MCP servers**
3. Add each required MCP server:
   - Click "Add an MCP server"
   - Enter server name (e.g., "cloudflare-bindings")
   - Enter HTTP URL (e.g., `https://bindings.mcp.cloudflare.com/sse`)
   - Complete OAuth authentication if required
   - Save configuration

### Step 2: Verify Configuration

Restart your development environment and verify the MCP connection:

```bash
# Restart Cline/VS Code to load new MCP configuration
# Check that the Cloudflare MCP server appears in the "Connected MCP Servers" section
```

### Step 3: Test MCP Tools

Use the test script to validate connectivity:

```bash
node scripts/test-mcp-connection.js
```

## 🐛 Troubleshooting

### Common Issues

#### 1. "Not Connected" Error

**Cause:** MCP portal URL incorrect or authentication failed

**Solution:**
- Verify portal URL in `cline_mcp_settings.json`
- Check CF_API_TOKEN is correct in environment
- Ensure MCP servers are added to portal in Cloudflare dashboard

#### 2. "Tool Not Found" Error

**Cause:** Specific MCP server not configured in portal

**Solution:**
- Log in to Cloudflare Zero Trust dashboard
- Navigate to MCP servers section
- Add the missing server (e.g., Workers Bindings, Browser Rendering)
- Complete OAuth authentication

#### 3. Authentication Timeout

**Cause:** API token expired or insufficient permissions

**Solution:**
- Generate new API token in Cloudflare dashboard
- Ensure token has required permissions:
  - Workers: Read/Write
  - Account: Read
  - Zone: Read (if needed)
- Update CF_API_TOKEN in `.env`

#### 4. Rate Limiting

**Cause:** Too many requests to MCP servers

**Solution:**
- Implement request throttling in agent code
- Use caching for frequently accessed data
- Increase timeout values in `cline_mcp_settings.json`

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

**Last Updated:** January 6, 2025  
**Configuration Version:** 1.0  
**Author:** Dev Team Platform
