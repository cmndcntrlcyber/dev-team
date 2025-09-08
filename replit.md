# Attack Node - Multi-Agent Security Platform

## Overview

Attack Node is a comprehensive red team operations management platform that combines AI-powered security testing with Docker-based security tools. The platform enables security professionals to manage penetration testing operations, vulnerability assessments, and red team engagements through an integrated web interface.

The application provides centralized management for security tools like Kali Linux, Burp Suite, Empire C2 framework, and other penetration testing utilities, while offering AI-driven vulnerability analysis and reporting capabilities through OpenAI and Anthropic integrations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety
- **UI Components**: Shadcn/UI component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom dark theme optimized for security professionals
- **State Management**: TanStack Query for server state and caching
- **Routing**: Wouter for lightweight client-side routing
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with TypeScript and ES modules
- **Framework**: Express.js for REST API endpoints
- **Database ORM**: Drizzle ORM with PostgreSQL for type-safe database operations
- **Authentication**: Google OAuth 2.0 with Passport.js and session-based auth
- **File Uploads**: Multer for handling file uploads with configurable size limits
- **Process Management**: Child process spawning for Docker container management

### Data Storage Solutions
- **Primary Database**: PostgreSQL for structured data (operations, vulnerabilities, users, configurations)
- **Session Storage**: PostgreSQL-backed session store for user authentication
- **File Storage**: Local filesystem with organized directory structure for uploads and container volumes
- **Container Data**: Docker volumes for persistent container data (Redis, PostgreSQL, application data)

### Container Management System
- **Docker Integration**: Comprehensive Docker container lifecycle management
- **Self-Healing Infrastructure**: Automated error detection and recovery for container issues
- **Health Monitoring**: Real-time health checks for Redis, PostgreSQL, Django applications, and Empire C2
- **Volume Management**: Automated permission fixing and volume validation
- **Error Recovery**: Progressive escalation strategies for different error types

### Authentication and Authorization
- **Google OAuth**: Primary authentication method with Google OAuth 2.0
- **Session Management**: Secure session handling with PostgreSQL session store
- **Development Mode**: Mock user support for local development without OAuth setup
- **CSRF Protection**: Session-based CSRF protection for all authenticated endpoints

### AI Integration Architecture
- **OpenAI Integration**: GPT-4o for vulnerability report generation and security analysis
- **Anthropic Claude**: Claude Sonnet 4 for advanced reasoning and complex security scenarios
- **Agent Loop System**: Multi-agent conversation loops for automated security testing workflows
- **Prompt Engineering**: Specialized prompts for security-focused AI interactions

## External Dependencies

### Third-Party APIs
- **OpenAI API**: GPT-4o model for vulnerability report generation and security analysis
- **Anthropic API**: Claude Sonnet 4 for advanced AI reasoning and complex security workflows
- **Google OAuth 2.0**: Authentication service for secure user login and session management

### Docker Container Registry
- **Docker Hub**: Primary registry for pulling security tool containers
- **Alternative Registries**: GitHub Container Registry, Quay.io, and GitLab Registry for fallback scenarios
- **Network Health Monitoring**: Automated detection and resolution of registry connectivity issues

### Security Tool Containers
- **Kali Linux**: `kasmweb/kali-rolling-desktop:develop` for penetration testing environment
- **Empire C2**: `bcsecurity/empire:latest` for command and control framework
- **Burp Suite**: Custom container deployment with professional license support
- **VS Code**: `kasmweb/vs-code:1.17.0` for web-based development environment
- **SysReptor**: Django-based reporting platform for professional security reports

### Database Dependencies
- **PostgreSQL**: Primary database server (supports both containerized and native installations)
- **Redis**: In-memory data structure store for caching and session management
- **Connection Pooling**: PG connection pool with automated connection management and health monitoring

### File System Dependencies
- **Upload Directory Structure**: Organized file storage for certificates, container data, and user files
- **Volume Mounts**: Docker volume mounts for persistent container data
- **Permission Management**: Automated UID/GID mapping for container file system access

### Network Dependencies
- **DNS Resolution**: Multiple DNS servers (8.8.8.8, 1.1.1.1) with automated DNS health monitoring
- **Port Management**: Dynamic port allocation and conflict resolution for container services
- **TLS/SSL**: Certificate management system for client certificates and secure connections