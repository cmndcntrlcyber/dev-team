# Attack Node 🔥

A comprehensive red team operations management platform with AI integration, Docker-based security tools, and advanced analytics. Transform your security testing workflow with intelligent automation and seamless tool integration.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)
![React](https://img.shields.io/badge/React-18.x-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)

## ✨ Features

### 🎯 Red Team Operations Management
- **Operation Planning**: Organize and track red team engagements
- **Target Management**: Centralized target tracking and documentation
- **Vulnerability Assessment**: Comprehensive vulnerability tracking and reporting
- **Progress Monitoring**: Real-time operation status and progress tracking

### 🤖 AI-Powered Intelligence
- **OpenAI Integration**: Leverage GPT models for reconnaissance and analysis
- **Anthropic Claude**: Advanced reasoning for complex security scenarios
- **Automated Reporting**: AI-generated vulnerability reports and documentation
- **Intelligent Recommendations**: AI-suggested attack vectors and methodologies

### 🐳 Docker-Based Security Tools
- **Kali Linux Environment**: Fully containerized Kali Linux with VNC access
- **Burp Suite Professional**: Integrated web application security testing
- **Tool Management**: Easy deployment and management of security tools
- **Isolated Environments**: Secure, isolated testing environments

### 📊 Advanced Analytics
- **Dashboard Analytics**: Real-time statistics and progress tracking
- **Vulnerability Trends**: Historical data analysis and trend visualization
- **Performance Metrics**: Operation efficiency and success rate tracking
- **Custom Reports**: Detailed reporting and data export capabilities

### 🔐 Security & Authentication
- **Google OAuth Integration**: Secure authentication with Google accounts
- **Session Management**: Secure session handling and user management
- **Role-Based Access**: Granular permission control
- **Audit Logging**: Comprehensive activity logging and monitoring

## 🚀 Quick Start

### Prerequisites
- Node.js 20.x or higher
- PostgreSQL 15+
- Docker & Docker Compose (optional, for security tools)
- Git

### Installation

#### Option 1: Quick Setup (Ubuntu 22.04)
```bash
git clone https://github.com/attck-nexus/attack-node.git
cd attack-node
chmod +x setup.sh
./setup.sh
npm run dev
```

#### Option 2: Manual Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/attck-nexus/attack-node.git
   cd attack-node
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start services (Docker)**
   ```bash
   npm run docker:dev
   ```

5. **Configure database**
   ```bash
   npm run db:push
   ```

6. **Start the application**
   ```bash
   npm run dev
   ```

7. **Access the application**
   - Open your browser to `http://localhost:5000`
   - Default development user is automatically created

## 📋 Environment Configuration

Create a `.env` file in the root directory:

```env
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/attacknode

# Server Configuration
NODE_ENV=development
PORT=5000
SESSION_SECRET=your_secure_session_secret_here

# AI Integration
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

# Google OAuth (Production)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

## 🛠️ Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **Drizzle ORM** - Database ORM
- **PostgreSQL** - Primary database
- **Passport.js** - Authentication
- **Multer** - File uploads
- **WebSocket** - Real-time communication

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Radix UI** - Component library
- **Tanstack Query** - Data fetching
- **Wouter** - Client-side routing
- **Framer Motion** - Animations

### AI & Integrations
- **OpenAI SDK** - GPT model integration
- **Anthropic SDK** - Claude model integration
- **Docker** - Containerization
- **WebSocket** - Real-time updates

## 🏗️ Project Structure

```
attack-node/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom hooks
│   │   └── lib/          # Utilities
├── server/                # Express backend
│   ├── services/         # Business logic
│   ├── routes.ts         # API routes
│   └── index.ts          # Server entry point
├── shared/               # Shared types and schemas
├── uploads/              # File uploads
└── public/              # Static assets
```

## 🔧 Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run check        # TypeScript type checking

# Production
npm run build        # Build for production
npm run start        # Start production server

# Database
npm run db:push      # Push database schema changes
```

## 🐳 Docker Integration

### Kali Linux Environment

**Access Information:**
- **URL**: `https://localhost:6902` (HTTPS required)
- **Username**: `kasm_user`
- **Password**: `password`
- **User Privileges**: Root access enabled for full system control
- **SSL Certificate**: Self-signed (accept browser security warning)

**Features:**
- **Persistent Storage**: All files and configurations automatically saved
- **Root Access**: Full administrative privileges for advanced operations
- **Shared Directory**: Access to `/home/kasm-user/shared` for file transfers
- **Pre-installed Tools**: Complete Kali Linux arsenal (Nmap, Metasploit, Burp Suite, etc.)

**Getting Started:**
1. Start Kali Linux container from the Integrations tab or Kali Environment page
2. Wait for container initialization (1-2 minutes for full setup)
3. Navigate to `https://localhost:6902` in your browser
4. Accept the SSL certificate warning (click "Advanced" → "Proceed to localhost")
5. Login with username `kasm_user` and password `password`
6. Enjoy full Kali Linux desktop with root privileges and persistent storage

**Data Persistence:**
- **Home Directory**: All user files persist between container restarts
- **Tool Configurations**: Settings and preferences automatically saved
- **Downloads**: Files downloaded remain available across sessions
- **Custom Scripts**: Personal scripts and tools persist permanently
- **Storage Location**: `uploads/kasm_profiles/kali-root/` on host system

**Troubleshooting:**
- **HTTP 401 Error**: Ensure you're using HTTPS (not HTTP) and correct credentials
- **Connection Refused**: Verify container is running via Docker Dashboard
- **SSL Warning**: Accept the self-signed certificate to proceed
- **Slow Loading**: Allow 2-3 minutes for complete container initialization
- **Permission Issues**: Container runs with root privileges for full access

### Burp Suite Professional

**Setup:**
1. Upload your Burp Suite Professional .jar file via the Burp Suite page
2. Optionally upload your license file for full functionality
3. Choose between GUI mode (VNC access) or headless mode (API only)
4. Access via the application's integrated interface

**Access Methods:**
- **GUI Mode**: Web-based VNC interface for full Burp Suite desktop
- **Headless Mode**: API integration for automated scanning
```

## 🤖 AI Agent Configuration

### OpenAI Integration
1. Obtain OpenAI API key from [OpenAI Platform](https://platform.openai.com/)
2. Add to `.env` file: `OPENAI_API_KEY=your_key_here`
3. Configure in the AI Agents section

### Anthropic Claude
1. Get Anthropic API key from [Anthropic Console](https://console.anthropic.com/)
2. Add to `.env` file: `ANTHROPIC_API_KEY=your_key_here`
3. Configure in the AI Agents section

## 📊 Dashboard Overview

The main dashboard provides:
- **Operation Statistics**: Active operations, vulnerabilities, and success metrics
- **AI Agent Status**: Real-time status of connected AI agents
- **Recent Activity**: Latest operations and findings
- **Vulnerability Trends**: Historical analysis and trending data
- **Quick Actions**: Rapid access to common tasks

## 🔒 Security Features

- **Secure Authentication**: Google OAuth integration with fallback
- **Session Management**: Secure session handling with PostgreSQL storage
- **File Upload Security**: Validated file uploads with size limits
- **Input Validation**: Comprehensive input validation using Zod
- **SQL Injection Prevention**: ORM-based queries with parameterization
- **XSS Protection**: Content Security Policy and input sanitization

## 🛡️ Best Practices

### Development
- Use TypeScript for type safety
- Follow React best practices
- Implement proper error handling
- Use environment variables for configuration
- Regular dependency updates

### Security
- Keep API keys secure
- Use strong session secrets
- Implement proper authentication
- Regular security audits
- Monitor for vulnerabilities

### Operations
- Regular database backups
- Monitor application logs
- Set up proper monitoring
- Use Docker for isolation
- Implement proper CI/CD

## 📚 Documentation

- [Deployment Guide](DEPLOYMENT_GUIDE.md) - Detailed deployment instructions
- [API Documentation](docs/api.md) - API endpoint documentation
- [Contributing Guide](CONTRIBUTING.md) - How to contribute to the project
- [Security Policy](SECURITY.md) - Security guidelines and reporting

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on:
- Code of conduct
- Development setup
- Pull request process
- Coding standards

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Getting Help
- Check the [Deployment Guide](DEPLOYMENT_GUIDE.md) for setup issues
- Review the application logs for error details
- Ensure all environment variables are correctly set
- Verify database connectivity

### Common Issues
- **Database Connection**: Check PostgreSQL service and credentials
- **Port Conflicts**: Ensure port 5000 is available
- **AI Integration**: Verify API keys are valid and have sufficient credits
- **Docker Issues**: Ensure Docker daemon is running

### Community
- Create an issue for bug reports
- Submit feature requests via GitHub issues
- Join discussions in the repository

## 🔮 Roadmap

### Upcoming Features
- **Advanced Reporting**: Enhanced report generation and export
- **Team Collaboration**: Multi-user operations and collaboration
- **API Integrations**: Extended third-party tool integrations
- **Mobile App**: Mobile companion application
- **Cloud Deployment**: One-click cloud deployment options

### Future Enhancements
- **Machine Learning**: Predictive analytics and pattern recognition
- **Advanced AI**: Custom AI model training and deployment
- **Enterprise Features**: SSO, RBAC, and enterprise security
- **Plugin System**: Extensible plugin architecture

---

**Attack Node** - Empowering red team operations with intelligent automation and seamless tool integration.

*Built with ❤️ by the security community*
