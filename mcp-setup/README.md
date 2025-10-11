# Google Cloud MCP Servers - Installation Guide

This directory contains setup scripts and documentation for installing Google Cloud MCP servers.

## Quick Start - gcloud-mcp & cloud-run-mcp

These are the simplest MCP servers to set up as they require **no API keys** - just Google Cloud authentication.

### Prerequisites

- Google Cloud account with an active project
- Terminal/command line access
- Internet connection

### Automated Setup

Run the setup script:

```bash
cd mcp-setup
chmod +x gcloud-cloudrun-setup.sh
./gcloud-cloudrun-setup.sh
```

The script will:
1. ✅ Check for gcloud CLI (and prompt to install if missing)
2. ✅ Check for Node.js v20+ (and prompt to install if missing)
3. ✅ Authenticate you with Google Cloud
4. ✅ Set up Application Default Credentials (ADC)
5. ✅ Set your default Google Cloud project
6. ✅ Enable required Google Cloud APIs
7. ✅ Test the MCP servers
8. ✅ Generate MCP client configuration files

### What You Need

**NO API keys required!** Both servers use Google Cloud's built-in authentication:

- **Google Cloud Account** - Your regular Google account with GCP access
- **Google Cloud Project** - Any existing project with billing enabled
- **ADC (Application Default Credentials)** - Automatically set up by the script

### Required Google Cloud APIs

The script will enable these APIs for you:
- Cloud Run API (`run.googleapis.com`)
- Cloud Build API (`cloudbuild.googleapis.com`)
- Artifact Registry API (`artifactregistry.googleapis.com`)
- Compute Engine API (`compute.googleapis.com`)
- Cloud Storage API (`storage.googleapis.com`)

### IAM Permissions

Your Google account needs these minimum roles:
- **Viewer** role (for read-only operations with gcloud-mcp)
- **Cloud Run Admin** (for cloud-run-mcp deployment operations)
- **Cloud Build Editor** (for cloud-run-mcp build operations)

---

## Manual Setup

If you prefer to set up manually or need to troubleshoot:

### 1. Install Prerequisites

**Install gcloud CLI:**
```bash
# Visit: https://cloud.google.com/sdk/docs/install
# Or for macOS with Homebrew:
brew install google-cloud-sdk
```

**Install Node.js v20+:**
```bash
# Visit: https://nodejs.org/
# Or for macOS with Homebrew:
brew install node
```

### 2. Authenticate with Google Cloud

```bash
# Login with your Google account
gcloud auth login

# Set up Application Default Credentials
gcloud auth application-default login

# Set your default project
gcloud config set project YOUR_PROJECT_ID
```

### 3. Enable Required APIs

```bash
# Enable all required APIs at once
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  compute.googleapis.com \
  storage.googleapis.com
```

### 4. Test MCP Servers

```bash
# Test gcloud-mcp
npx -y @google-cloud/gcloud-mcp --version

# Test cloud-run-mcp
npx -y @google-cloud/cloud-run-mcp --help
```

### 5. Configure Your MCP Client

Add this to your MCP client's configuration file:

**Basic Configuration:**
```json
{
  "mcpServers": {
    "gcloud": {
      "command": "npx",
      "args": ["-y", "@google-cloud/gcloud-mcp"]
    },
    "cloud-run": {
      "command": "npx",
      "args": ["-y", "@google-cloud/cloud-run-mcp"],
      "env": {
        "GOOGLE_CLOUD_PROJECT": "YOUR_PROJECT_ID"
      }
    }
  }
}
```

**Configuration File Locations:**
- **Claude Desktop**: `~/Claude/claude_desktop_config.json`
- **Cline (VS Code)**: `.vscode/cline_mcp_settings.json`
- **Cursor**: `~/.cursor/mcp.json`
- **Gemini CLI**: `~/.gemini/settings.json`

---

## Testing Your Setup

After configuration, restart your MCP client and try these prompts:

### For gcloud-mcp:
- "List my Google Cloud projects"
- "Show me my compute instances"
- "What GCS buckets do I have?"
- "List my Kubernetes clusters"

### For cloud-run-mcp:
- "List my Cloud Run services"
- "Show details for service [name]"
- "Deploy this directory to Cloud Run"
- "Get logs for my Cloud Run service"

---

## Troubleshooting

### "gcloud: command not found"
- Install gcloud CLI from: https://cloud.google.com/sdk/docs/install
- Ensure it's in your PATH

### "Node.js version too old"
- Install Node.js v20+ from: https://nodejs.org/
- Verify with: `node --version`

### "Permission denied" errors
- Check your IAM roles in Google Cloud Console
- Ensure you have necessary permissions for the operations

### "API not enabled" errors
- Run the enable APIs command again
- Check APIs in Cloud Console: https://console.cloud.google.com/apis

### MCP client not recognizing servers
- Verify configuration file syntax (valid JSON)
- Restart your MCP client completely
- Check MCP client logs for errors

### Authentication issues
- Re-run: `gcloud auth application-default login`
- Verify credentials file exists: `~/.config/gcloud/application_default_credentials.json`
- Check current account: `gcloud auth list`

---

## Advanced Configuration

### Using Service Accounts

If you need to use a service account instead of user credentials:

```bash
# Create a service account
gcloud iam service-accounts create mcp-servers \
  --display-name="MCP Servers Service Account"

# Grant necessary roles
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:mcp-servers@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/viewer"

# Create and download key
gcloud iam service-accounts keys create ~/mcp-service-account.json \
  --iam-account=mcp-servers@YOUR_PROJECT_ID.iam.gserviceaccount.com

# Use in MCP config
{
  "mcpServers": {
    "gcloud": {
      "command": "npx",
      "args": ["-y", "@google-cloud/gcloud-mcp"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "/path/to/mcp-service-account.json"
      }
    }
  }
}
```

### Setting Default Region

```json
{
  "mcpServers": {
    "gcloud": {
      "command": "npx",
      "args": ["-y", "@google-cloud/gcloud-mcp"],
      "env": {
        "GOOGLE_CLOUD_PROJECT": "YOUR_PROJECT_ID",
        "GOOGLE_CLOUD_REGION": "us-central1"
      }
    }
  }
}
```

### Multiple Environments

Create separate configurations for dev/staging/prod:

```json
{
  "mcpServers": {
    "gcloud-dev": {
      "command": "npx",
      "args": ["-y", "@google-cloud/gcloud-mcp"],
      "env": {
        "GOOGLE_CLOUD_PROJECT": "my-project-dev"
      }
    },
    "gcloud-prod": {
      "command": "npx",
      "args": ["-y", "@google-cloud/gcloud-mcp"],
      "env": {
        "GOOGLE_CLOUD_PROJECT": "my-project-prod"
      }
    }
  }
}
```

---

## What These Servers Can Do

### gcloud-mcp Capabilities

Execute any gcloud command through natural language:
- List and manage resources (VMs, storage, databases)
- Query resource status and configuration
- View logs and metrics
- Manage Kubernetes clusters
- Access Cloud Storage
- And much more - anything gcloud CLI can do!

**Security Note**: The server has built-in restrictions on dangerous commands (like deleting resources) but can still execute read-only and most management operations.

### cloud-run-mcp Capabilities

Deploy and manage Cloud Run services:
- Deploy applications from local directories
- Deploy from file contents (for generated code)
- List and inspect Cloud Run services
- View service logs and errors
- Manage Cloud Run revisions
- Create and manage projects

---

## Security Best Practices

1. **Principle of Least Privilege**
   - Only grant necessary IAM roles
   - Use service accounts with limited permissions
   - Regularly audit permissions

2. **Credential Management**
   - Keep ADC credentials secure
   - Don't commit service account keys to version control
   - Rotate credentials regularly

3. **Project Isolation**
   - Use separate projects for dev/staging/prod
   - Configure different MCP instances per environment

4. **Monitoring**
   - Enable Cloud Audit Logs
   - Review MCP server actions regularly
   - Set up alerts for unexpected operations

---

## Getting Help

- **gcloud-mcp GitHub**: https://github.com/googleapis/gcloud-mcp
- **cloud-run-mcp GitHub**: https://github.com/GoogleCloudPlatform/cloud-run-mcp
- **MCP Documentation**: https://modelcontextprotocol.io/
- **Google Cloud Support**: https://cloud.google.com/support

---

## Next Steps

Once you have gcloud-mcp and cloud-run-mcp working, you can explore other Google Cloud MCP servers:

- **gke-mcp** - Google Kubernetes Engine management
- **google-analytics-mcp** - Google Analytics integration
- **genai-toolbox** - Database query and management
- **mcp-security** - Security Operations and Threat Intelligence
- **vertex-ai-creative-studio** - GenAI media generation

See the main repository documentation for setup instructions for these additional servers.

---

## Files in This Directory

- `gcloud-cloudrun-setup.sh` - Automated setup script
- `README.md` - This documentation file
- `mcp-config.json` - Generated configuration (after running setup)
- `mcp-config-explicit.json` - Alternative config with explicit credentials
- `.adc_path` - Saved ADC credentials path (temporary)
- `.project_id` - Saved project ID (temporary)
