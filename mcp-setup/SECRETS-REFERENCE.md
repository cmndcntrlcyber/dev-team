# MCP Servers - Secrets & Authentication Reference

This document provides a comprehensive reference for all authentication requirements, API keys, and secrets needed for the Google Cloud MCP servers.

## Table of Contents

- [Overview](#overview)
- [Common Requirements (All Servers)](#common-requirements-all-servers)
- [Server-Specific Requirements](#server-specific-requirements)
  - [gcloud-mcp](#gcloud-mcp)
  - [cloud-run-mcp](#cloud-run-mcp)
  - [gke-mcp](#gke-mcp)
  - [google-analytics-mcp](#google-analytics-mcp)
  - [genai-toolbox](#genai-toolbox)
  - [mcp-security (4 servers)](#mcp-security-4-servers)
  - [vertex-ai-creative-studio](#vertex-ai-creative-studio)
- [Quick Setup Commands](#quick-setup-commands)
- [Environment Variables Template](#environment-variables-template)

---

## Overview

**Total Servers**: 8 main servers (mcp-security contains 4 sub-servers)

**Authentication Methods**:
- Application Default Credentials (ADC) - Most servers
- API Keys - Security servers only
- Service Account Keys - Optional for all

---

## Common Requirements (All Servers)

### Google Cloud Authentication

**Required for ALL servers:**

```bash
# 1. Install gcloud CLI
# Download from: https://cloud.google.com/sdk/docs/install

# 2. Authenticate with your Google account
gcloud auth login

# 3. Set up Application Default Credentials
gcloud auth application-default login

# 4. Set default project
gcloud config set project YOUR_PROJECT_ID
```

**Credentials File Location:**
- Linux/macOS: `~/.config/gcloud/application_default_credentials.json`
- Windows: `%APPDATA%\gcloud\application_default_credentials.json`

**Environment Variables (Optional but recommended):**
- `GOOGLE_APPLICATION_CREDENTIALS` - Path to credentials JSON
- `GOOGLE_CLOUD_PROJECT` - Your GCP project ID
- `GOOGLE_CLOUD_REGION` - Default region (e.g., `us-central1`)

---

## Server-Specific Requirements

### gcloud-mcp

**Technology**: TypeScript/Node.js

**Secrets Required**: ✅ NONE (uses ADC)

**API Keys**: ❌ Not needed

**Google Cloud APIs to Enable**:
```bash
gcloud services enable compute.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable container.googleapis.com  # If using GKE
gcloud services enable aiplatform.googleapis.com  # If using AI Platform
```

**IAM Permissions**:
- `roles/viewer` (minimum for read operations)
- Additional roles based on operations needed

**Environment Variables**:
```bash
# Optional
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_REGION=us-central1
```

**MCP Config**:
```json
{
  "gcloud": {
    "command": "npx",
    "args": ["-y", "@google-cloud/gcloud-mcp"]
  }
}
```

---

### cloud-run-mcp

**Technology**: JavaScript/Node.js

**Secrets Required**: ✅ NONE (uses ADC)

**API Keys**: ❌ Not needed

**Google Cloud APIs to Enable**:
```bash
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable storage.googleapis.com
```

**IAM Permissions**:
- `roles/run.admin`
- `roles/cloudbuild.builds.editor`
- `roles/iam.serviceAccountUser`
- `roles/storage.admin`

**Environment Variables**:
```bash
# Optional
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_REGION=us-central1
DEFAULT_SERVICE_NAME=my-service
```

**MCP Config**:
```json
{
  "cloud-run": {
    "command": "npx",
    "args": ["-y", "@google-cloud/cloud-run-mcp"],
    "env": {
      "GOOGLE_CLOUD_PROJECT": "your-project-id"
    }
  }
}
```

---

### gke-mcp

**Technology**: Go

**Secrets Required**: ✅ NONE (uses ADC)

**API Keys**: ❌ Not needed

**Google Cloud APIs to Enable**:
```bash
gcloud services enable container.googleapis.com
gcloud services enable compute.googleapis.com
```

**IAM Permissions**:
- `roles/container.viewer` (minimum)
- `roles/container.admin` (for management operations)

**Installation**:
```bash
# Option 1: Go install
go install github.com/GoogleCloudPlatform/gke-mcp@latest

# Option 2: Download binary from releases
# https://github.com/GoogleCloudPlatform/gke-mcp/releases
```

**Environment Variables**:
```bash
# Optional
GOOGLE_CLOUD_PROJECT=your-project-id
```

**MCP Config**:
```json
{
  "gke": {
    "command": "gke-mcp"
  }
}
```

---

### google-analytics-mcp

**Technology**: Python

**Secrets Required**: ✅ NONE (uses ADC with specific scopes)

**API Keys**: ❌ Not needed

**Google Cloud APIs to Enable**:
```bash
gcloud services enable analyticsadmin.googleapis.com
gcloud services enable analyticsdata.googleapis.com
```

**IAM Permissions**:
- Google Analytics read access on the accounts/properties you want to query
- Note: This uses Google Analytics permissions, not GCP IAM

**Special Authentication Setup**:
```bash
# ADC with Analytics scope
gcloud auth application-default login \
  --scopes=https://www.googleapis.com/auth/analytics.readonly,https://www.googleapis.com/auth/cloud-platform
```

**Installation**:
```bash
pipx install analytics-mcp
```

**Environment Variables**:
```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
GOOGLE_CLOUD_PROJECT=your-project-id
```

**MCP Config**:
```json
{
  "analytics": {
    "command": "pipx",
    "args": ["run", "analytics-mcp"],
    "env": {
      "GOOGLE_APPLICATION_CREDENTIALS": "/path/to/credentials.json",
      "GOOGLE_CLOUD_PROJECT": "your-project-id"
    }
  }
}
```

---

### genai-toolbox

**Technology**: Go

**Secrets Required**: ✅ NONE (uses ADC)

**API Keys**: ❌ Not needed (for GCP databases)

**Database Credentials**: ⚠️ Required for external databases

**Google Cloud APIs to Enable**:
```bash
gcloud services enable aiplatform.googleapis.com
gcloud services enable bigquery.googleapis.com  # If using BigQuery
gcloud services enable sqladmin.googleapis.com   # If using Cloud SQL
```

**Installation**:
```bash
# Download binary from releases
# https://github.com/googleapis/genai-toolbox/releases

# Or build from source
git clone https://github.com/googleapis/genai-toolbox.git
cd genai-toolbox
go build
```

**Configuration File Required**: `tools.yaml`

Example `tools.yaml`:
```yaml
sources:
  my-bigquery:
    kind: bigquery
    project: your-project-id
    dataset: your-dataset

tools:
  query-users:
    kind: bigquery-sql
    source: my-bigquery
    description: Query user data
    statement: SELECT * FROM users LIMIT 10
```

**Environment Variables**:
```bash
GOOGLE_CLOUD_PROJECT=your-project-id
```

**MCP Config**:
```json
{
  "genai-toolbox": {
    "command": "/path/to/toolbox",
    "args": ["--tools-file", "tools.yaml"]
  }
}
```

---

### mcp-security (4 servers)

This package contains 4 separate MCP servers.

#### 1. SecOps (Chronicle) Server

**Technology**: Python

**Secrets Required**: ✅ Chronicle configuration

**API Keys**: ❌ Not needed (uses ADC)

**Required Secrets**:
```bash
CHRONICLE_PROJECT_ID=your-project-id
CHRONICLE_CUSTOMER_ID=01234567-abcd-4321-1234-0123456789ab
CHRONICLE_REGION=us  # or europe, asia
```

**How to Get Chronicle Credentials**:
- Login to Chronicle console
- Customer ID is in your Chronicle tenant settings
- Region is your Chronicle instance region

**Installation**:
```bash
pipx install google-secops-mcp
```

**MCP Config**:
```json
{
  "secops": {
    "command": "pipx",
    "args": ["run", "google-secops-mcp"],
    "env": {
      "CHRONICLE_PROJECT_ID": "your-project",
      "CHRONICLE_CUSTOMER_ID": "01234567-abcd-4321-1234-0123456789ab",
      "CHRONICLE_REGION": "us"
    }
  }
}
```

#### 2. GTI (Google Threat Intelligence) Server

**Technology**: Python

**Secrets Required**: ✅ VirusTotal API Key

**API Keys**: ✅ **REQUIRED**

**Required Secrets**:
```bash
VT_APIKEY=your-64-character-virustotal-api-key
```

**How to Get VirusTotal API Key**:
1. Create account at https://www.virustotal.com
2. Go to https://www.virustotal.com/gui/my-apikey
3. Copy your API key (64 hex characters)

**Installation**:
```bash
pipx install gti-mcp
```

**MCP Config**:
```json
{
  "gti": {
    "command": "pipx",
    "args": ["run", "gti-mcp"],
    "env": {
      "VT_APIKEY": "your-virustotal-api-key-here"
    }
  }
}
```

#### 3. SCC (Security Command Center) Server

**Technology**: Python

**Secrets Required**: ✅ NONE (uses ADC)

**API Keys**: ❌ Not needed

**Google Cloud APIs to Enable**:
```bash
gcloud services enable securitycenter.googleapis.com
```

**IAM Permissions**:
- `roles/securitycenter.findingsViewer` (minimum)
- `roles/securitycenter.admin` (for full access)

**Installation**:
```bash
pipx install scc-mcp
```

**MCP Config**:
```json
{
  "scc": {
    "command": "pipx",
    "args": ["run", "scc-mcp"]
  }
}
```

#### 4. SecOps SOAR Server

**Technology**: Python

**Secrets Required**: ✅ SOAR instance credentials

**API Keys**: ✅ **REQUIRED**

**Required Secrets**:
```bash
SOAR_URL=https://yours-here.siemplify-soar.com:443
SOAR_APP_KEY=01234567-abcd-4321-1234-0123456789ab
```

**How to Get SOAR Credentials**:
- From your SecOps SOAR admin console
- App key is generated for API access

**Installation**:
```bash
pipx install secops-soar-mcp
```

**MCP Config**:
```json
{
  "soar": {
    "command": "pipx",
    "args": ["run", "secops-soar-mcp", "--integrations", "CSV,OKTA"],
    "env": {
      "SOAR_URL": "https://yours.siemplify-soar.com:443",
      "SOAR_APP_KEY": "your-app-key-here"
    }
  }
}
```

---

### vertex-ai-creative-studio

**Technology**: Python (Multiple MCP servers in experiments folder)

**Secrets Required**: ✅ NONE (uses ADC)

**API Keys**: ❌ Not needed

**Google Cloud APIs to Enable**:
```bash
gcloud services enable aiplatform.googleapis.com
gcloud services enable firestore.googleapis.com
gcloud services enable storage.googleapis.com
```

**Location**: Experimental MCP servers in `experiments/mcp-genmedia/`

**Available Servers**:
- `mcp-imagen` - Image generation (Imagen)
- `mcp-veo` - Video generation (Veo)
- `mcp-lyria` - Music generation (Lyria)
- `mcp-chirp3` - Speech synthesis (Chirp)
- `mcp-gemini` - Gemini AI integration
- `mcp-avtool` - Audio/video tools

**Setup**: Requires cloning repo and building each server individually

**Environment Variables**:
```bash
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_REGION=us-central1
```

---

## Quick Setup Commands

### Install All Prerequisites

```bash
# Install gcloud CLI
# https://cloud.google.com/sdk/docs/install

# Install Node.js (for gcloud-mcp, cloud-run-mcp)
brew install node  # macOS
# or download from https://nodejs.org/

# Install Python tools (for analytics, security servers)
pip install pipx
pipx ensurepath

# Install Go (for gke-mcp, genai-toolbox)
brew install go  # macOS
# or download from https://go.dev/
```

### Authenticate with Google Cloud

```bash
# Standard authentication
gcloud auth login
gcloud auth application-default login
gcloud config set project YOUR_PROJECT_ID

# For Google Analytics
gcloud auth application-default login \
  --scopes=https://www.googleapis.com/auth/analytics.readonly,https://www.googleapis.com/auth/cloud-platform
```

### Enable All Common APIs

```bash
gcloud services enable \
  aiplatform.googleapis.com \
  compute.googleapis.com \
  storage.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  container.googleapis.com \
  analyticsadmin.googleapis.com \
  analyticsdata.googleapis.com \
  bigquery.googleapis.com \
  securitycenter.googleapis.com
```

---

## Environment Variables Template

Create a `.env` file with your secrets (DO NOT commit to git):

```bash
# ===== Common Google Cloud Settings =====
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_REGION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json

# ===== Chronicle/SecOps Settings =====
CHRONICLE_PROJECT_ID=your-project-id
CHRONICLE_CUSTOMER_ID=01234567-abcd-4321-1234-0123456789ab
CHRONICLE_REGION=us

# ===== Google Threat Intelligence Settings =====
VT_APIKEY=your-64-character-virustotal-api-key

# ===== SecOps SOAR Settings =====
SOAR_URL=https://yours.siemplify-soar.com:443
SOAR_APP_KEY=01234567-abcd-4321-1234-0123456789ab

# ===== Cloud Run MCP Settings (Optional) =====
DEFAULT_SERVICE_NAME=my-service

# ===== GenAI Toolbox Settings (Optional) =====
# Add database connection strings as needed
```

---

## Security Checklist

- [ ] ADC credentials file secured (never commit to git)
- [ ] Service account keys secured (if using)
- [ ] API keys stored in environment variables (not hardcoded)
- [ ] `.env` file added to `.gitignore`
- [ ] Minimum necessary IAM permissions granted
- [ ] Regular credential rotation scheduled
- [ ] Audit logs enabled
- [ ] Separate projects for dev/staging/prod

---

## Summary Table

| Server | Technology | API Key Required | Special Secrets | Installation Method |
|--------|-----------|------------------|-----------------|-------------------|
| gcloud-mcp | Node.js | ❌ No | None | `npx` |
| cloud-run-mcp | Node.js | ❌ No | None | `npx` |
| gke-mcp | Go | ❌ No | None | Binary/Go install |
| google-analytics-mcp | Python | ❌ No | None (special auth scope) | `pipx` |
| genai-toolbox | Go | ❌ No | Database creds (optional) | Binary |
| secops-mcp | Python | ❌ No | Chronicle config | `pipx` |
| gti-mcp | Python | ✅ Yes | VirusTotal API key | `pipx` |
| scc-mcp | Python | ❌ No | None | `pipx` |
| soar-mcp | Python | ✅ Yes | SOAR URL + App Key | `pipx` |
| vertex-ai-creative-studio | Python | ❌ No | None | Clone + Build |

**Total API Keys Needed**: 2
- VirusTotal API key (for GTI)
- SOAR App Key (for SOAR)

**Everything else uses Google Cloud ADC!**

---

## Next Steps

1. Start with the automated setup script for gcloud-mcp and cloud-run-mcp
2. Obtain required API keys for security servers if needed
3. Install servers one at a time
4. Test each server before moving to the next
5. Document your specific configuration

For detailed setup instructions, see:
- `README.md` - Complete installation guide
- `gcloud-cloudrun-setup.sh` - Automated setup script
