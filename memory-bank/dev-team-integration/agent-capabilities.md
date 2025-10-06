# Dev-Team Agent Capabilities

Reference guide for understanding what each agent can and should do.

## Agent Roster

### Architecture Agent (Port 3010)
**Primary Role**: Technical leadership and project coordination

**Capabilities**:
- Technology stack recommendations
- System architecture design
- Component integration planning
- Code review and quality oversight
- Technical documentation
- Risk assessment and mitigation
- Performance optimization strategies
- Security architecture review

**Best Used For**:
- Initial project planning
- Complex system design decisions
- Integration coordination between teams
- Technical debt assessment
- Architecture documentation

**Limitations**:
- Not for hands-on coding (delegates to other agents)
- Focuses on high-level design, not implementation details
- May need additional context for domain-specific architectures

---

### Frontend Agent (Port 3011)
**Primary Role**: UI/UX development and client-side implementation

**Capabilities**:
- React, Vue, Angular, Svelte component creation
- Responsive design with CSS/Tailwind/Material-UI
- State management (Redux, Zustand, Context API, Pinia)
- API integration and data fetching
- Form validation and user input handling
- Accessibility (WCAG 2.1) implementation
- Performance optimization (lazy loading, code splitting)
- Animation and interactive elements
- Component library creation

**Best Used For**:
- Building user interfaces
- Creating reusable components
- Implementing design systems
- Client-side routing
- Form handling
- Data visualization

**Limitations**:
- No backend or database work
- Limited to client-side JavaScript/TypeScript
- May need design specifications for complex UIs

**Typical Deliverables**:
- React/Vue/Angular components
- CSS/SCSS stylesheets
- Component tests (Jest, React Testing Library)
- Storybook documentation
- Props interfaces/types

---

### Backend Agent (Port 3012)
**Primary Role**: Server-side development and API implementation

**Capabilities**:
- RESTful API development (Express, FastAPI, NestJS)
- GraphQL server implementation
- Database schema design (PostgreSQL, MySQL, MongoDB)
- ORM/Query builder setup (Prisma, Drizzle, Sequelize)
- Authentication systems (JWT, OAuth, session-based)
- Authorization and RBAC implementation
- Middleware development
- Error handling and logging
- API documentation (OpenAPI/Swagger)
- WebSocket/real-time features
- Background job processing
- File upload handling

**Best Used For**:
- API endpoint creation
- Database operations
- Authentication/authorization
- Business logic implementation
- Data validation
- Third-party API integration (server-side)

**Limitations**:
- No UI work
- Limited to server-side technologies
- May need clear API specifications

**Typical Deliverables**:
- API endpoints
- Database migrations
- Authentication middleware
- API documentation
- Unit tests for business logic
- Database seed files

---

### QA Agent (Port 3013)
**Primary Role**: Testing and quality assurance

**Capabilities**:
- Unit test creation (Jest, Pytest, Mocha)
- Integration test development
- End-to-end test automation (Playwright, Cypress)
- API testing (Supertest, Postman)
- Code quality analysis (ESLint, Prettier, SonarQube)
- Security vulnerability scanning (OWASP, npm audit)
- Performance testing and benchmarking
- Accessibility validation (axe, WAVE)
- Test coverage reporting
- CI/CD pipeline testing stages
- Load testing (k6, JMeter)

**Best Used For**:
- Comprehensive test suites
- Quality gate implementation
- Security audits
- Performance benchmarking
- Code quality enforcement
- Test automation

**Limitations**:
- Requires completed code to test
- Cannot fix bugs (reports them)
- May need example test data

**Typical Deliverables**:
- Test files and suites
- Coverage reports
- Security scan results
- Performance benchmarks
- Quality metrics dashboard
- CI/CD test configurations

---

### DevOps Agent (Port 3014)
**Primary Role**: Infrastructure and deployment automation

**Capabilities**:
- Dockerfile and Docker Compose creation
- Kubernetes manifests and Helm charts
- CI/CD pipeline configuration (GitHub Actions, GitLab CI, Jenkins)
- Cloud infrastructure setup (AWS, GCP, Azure)
- Infrastructure as Code (Terraform, CloudFormation)
- Environment configuration management
- Monitoring and logging setup (Prometheus, Grafana, ELK)
- Load balancing and scaling configuration
- SSL/TLS certificate management
- Backup and disaster recovery planning
- Deployment strategies (blue-green, canary)

**Best Used For**:
- Containerization
- CI/CD automation
- Cloud deployments
- Infrastructure provisioning
- Monitoring setup
- Scaling strategies

**Limitations**:
- Requires application code to be complete
- May need cloud provider credentials
- Limited to infrastructure, not application logic

**Typical Deliverables**:
- Dockerfiles and docker-compose.yml
- CI/CD pipeline files
- Kubernetes/Helm configurations
- Terraform/CloudFormation templates
- Monitoring dashboards
- Deployment scripts
- Environment documentation

---

### MCP Agent (Port 3015)
**Primary Role**: Model Context Protocol server development

**Capabilities**:
- MCP server implementation
- Custom tool creation for MCP
- Resource provider development
- Prompt template creation
- External API integration (GitHub, OpenAI, databases)
- MCP protocol compliance
- Tool documentation generation
- Client integration examples
- Security and authentication for tools
- Error handling for MCP operations

**Best Used For**:
- Creating custom MCP servers
- Integrating external services via MCP
- Building specialized tools for AI agents
- Extending Cline with new capabilities
- API wrapper development

**Limitations**:
- Specific to MCP protocol
- Requires understanding of MCP specification
- Limited to tool/resource creation

**Typical Deliverables**:
- MCP server implementation
- Tool and resource definitions
- Client integration code
- Server documentation
- Example usage
- Testing utilities

---

## Agent Selection Guide

### For Different Project Types:

**Single Page Application (SPA)**:
- Architecture: Project planning
- Frontend: UI components, routing, state
- Backend: API endpoints
- QA: Unit, integration, E2E tests
- DevOps: Build, deployment

**REST API Service**:
- Architecture: API design
- Backend: Endpoints, validation, auth
- QA: API tests, security scan
- DevOps: Containerization, deployment

**Full-Stack Application**:
- All agents typically needed
- Architecture coordinates integration
- Frontend and Backend work in parallel
- QA follows development
- DevOps handles deployment

**MCP Server**:
- MCP: Core implementation
- Backend: If API integration needed
- QA: Tool testing
- DevOps: Deployment

---

## Task Assignment Best Practices

1. **Start with Architecture** for complex projects
2. **Parallel frontend/backend** when possible
3. **QA after development** phases complete
4. **DevOps near the end** when app is stable
5. **MCP agent** for tool integration needs

---

## Performance Notes

**Response Times** (average):
- Architecture: 2-5 minutes per task
- Frontend: 3-7 minutes per component
- Backend: 4-8 minutes per endpoint
- QA: 5-10 minutes per test suite
- DevOps: 3-6 minutes per configuration
- MCP: 4-7 minutes per tool

**Quality Levels**:
- First-try success rate: 70-85%
- Typical revisions needed: 0-2 per task
- Code quality: 8-9/10 average

---

## Last Updated
2025-01-10 - Initial agent capabilities documented
