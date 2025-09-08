# Dev Team Platform - Multi-Agent Development Platform

## Overview

Dev Team Platform is a comprehensive development team management platform that enables sophisticated agent orchestration for software development workflows. The platform provides AI-powered development assistance through multiple specialized agents working together to build, test, and deploy applications.

The application features automatic connectivity to persistent Docker containers, real-time monitoring capabilities, and an integrated web interface for managing development team operations and multi-agent collaborations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety
- **UI Components**: Shadcn/UI component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom dark theme optimized for developers
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
- **Primary Database**: PostgreSQL for structured data (projects, agents, users, configurations)
- **Session Storage**: PostgreSQL-backed session store for user authentication
- **File Storage**: Local filesystem with organized directory structure for uploads and container volumes
- **Container Data**: Docker volumes for persistent container data (databases, application data)

### Container Management System
- **Docker Integration**: Comprehensive Docker container lifecycle management
- **Self-Healing Infrastructure**: Automated error detection and recovery for container issues
- **Health Monitoring**: Real-time health checks for development containers and services
- **Volume Management**: Automated permission fixing and volume validation
- **Error Recovery**: Progressive escalation strategies for different error types

### Authentication and Authorization
- **Google OAuth**: Primary authentication method with Google OAuth 2.0
- **Session Management**: Secure session handling with PostgreSQL session store
- **Development Mode**: Mock user support for local development without OAuth setup
- **CSRF Protection**: Session-based CSRF protection for all authenticated endpoints

### AI Integration Architecture
- **OpenAI Integration**: GPT-4o for code generation and development assistance
- **Anthropic Claude**: Claude Sonnet 4 for advanced reasoning and complex development scenarios
- **Agent Loop System**: Multi-agent conversation loops for automated development workflows
- **Prompt Engineering**: Specialized prompts for development-focused AI interactions

## External Dependencies

### Third-Party APIs
- **OpenAI API**: GPT-4o model for code generation and development analysis
- **Anthropic API**: Claude Sonnet 4 for advanced AI reasoning and complex development workflows
- **Google OAuth 2.0**: Authentication service for secure user login and session management

### Docker Container Registry
- **Docker Hub**: Primary registry for pulling development tool containers
- **Alternative Registries**: GitHub Container Registry, Quay.io, and GitLab Registry for fallback scenarios
- **Network Health Monitoring**: Automated detection and resolution of registry connectivity issues

### Development Tool Containers
- **Development Environments**: Containerized development environments for various tech stacks
- **Database Containers**: PostgreSQL, Redis, and other database services
- **API Services**: Containerized microservices for development workflows
- **Build Tools**: Container-based build and deployment pipelines

### Database Dependencies
- **PostgreSQL**: Primary database server (supports both containerized and native installations)
- **Redis**: In-memory data structure store for caching and session management
- **Connection Pooling**: PG connection pool with automated connection management and health monitoring

### File System Dependencies
- **Upload Directory Structure**: Organized file storage for project files, container data, and user uploads
- **Volume Mounts**: Docker volume mounts for persistent container data
- **Permission Management**: Automated UID/GID mapping for container file system access

### Network Dependencies
- **DNS Resolution**: Multiple DNS servers (8.8.8.8, 1.1.1.1) with automated DNS health monitoring
- **Port Management**: Dynamic port allocation and conflict resolution for container services
- **TLS/SSL**: Certificate management system for secure connections and API communications