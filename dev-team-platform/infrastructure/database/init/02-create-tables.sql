-- Create core tables for Dev Team Platform

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'DEVELOPER' CHECK (role IN ('ADMIN', 'MANAGER', 'DEVELOPER', 'VIEWER')),
    avatar VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMP,
    preferences JSONB DEFAULT '{}',
    permissions JSONB DEFAULT '[]'
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_id UUID,
    status VARCHAR(50) NOT NULL DEFAULT 'PLANNING' CHECK (status IN ('PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED', 'ARCHIVED')),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    due_date TIMESTAMP,
    team_members JSONB DEFAULT '[]',
    tags JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    configuration JSONB DEFAULT '{}'
);

-- Project templates table
CREATE TABLE IF NOT EXISTS project_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    technologies JSONB DEFAULT '[]',
    agents JSONB DEFAULT '{}',
    phases JSONB DEFAULT '[]',
    estimated_duration INTEGER, -- in hours
    complexity VARCHAR(20) DEFAULT 'MEDIUM' CHECK (complexity IN ('LOW', 'MEDIUM', 'HIGH')),
    version VARCHAR(20) DEFAULT '1.0.0',
    author VARCHAR(255),
    icon VARCHAR(500),
    tags JSONB DEFAULT '[]',
    requirements JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('FOUNDATION', 'AGENT_DEVELOPMENT', 'INTEGRATION', 'UI_DEVELOPMENT', 'TESTING', 'DOCUMENTATION', 'DEPLOYMENT', 'CODE_GENERATION', 'CODE_REVIEW', 'BUG_FIX', 'REFACTORING')),
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
    status VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED' CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'REVIEW', 'TESTING', 'COMPLETED', 'DEFERRED', 'CANCELLED')),
    assigned_to VARCHAR(255), -- Agent ID
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    due_date TIMESTAMP,
    estimated_hours INTEGER DEFAULT 0,
    actual_hours INTEGER,
    dependencies JSONB DEFAULT '[]',
    blockers JSONB DEFAULT '[]',
    tags JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}'
);

-- Task dependencies table (for easier querying)
CREATE TABLE IF NOT EXISTS task_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(task_id, depends_on_task_id)
);

-- Task progress tracking
CREATE TABLE IF NOT EXISTS task_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    percentage INTEGER DEFAULT 0 CHECK (percentage >= 0 AND percentage <= 100),
    current_step VARCHAR(255),
    total_steps INTEGER DEFAULT 0,
    completed_steps INTEGER DEFAULT 0,
    time_spent INTEGER DEFAULT 0, -- in minutes
    estimated_remaining INTEGER DEFAULT 0, -- in minutes
    last_update TIMESTAMP NOT NULL DEFAULT NOW(),
    details JSONB DEFAULT '[]'
);

-- Task comments/updates
CREATE TABLE IF NOT EXISTS task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    author_type VARCHAR(20) DEFAULT 'USER' CHECK (author_type IN ('USER', 'AGENT', 'SYSTEM')),
    content TEXT NOT NULL,
    comment_type VARCHAR(50) DEFAULT 'COMMENT' CHECK (comment_type IN ('COMMENT', 'STATUS_UPDATE', 'ASSIGNMENT', 'BLOCKER', 'RESOLUTION')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Project files tracking
CREATE TABLE IF NOT EXISTS project_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    file_path VARCHAR(1000) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT DEFAULT 0,
    mime_type VARCHAR(100),
    file_hash VARCHAR(64), -- SHA-256 hash
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by_agent VARCHAR(255),
    metadata JSONB DEFAULT '{}'
);

-- Agent status and metrics
CREATE TABLE IF NOT EXISTS agent_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id VARCHAR(255) UNIQUE NOT NULL,
    agent_type VARCHAR(50) NOT NULL CHECK (agent_type IN ('ARCHITECTURE_LEAD', 'FRONTEND_CORE', 'BACKEND_INTEGRATION', 'QUALITY_ASSURANCE', 'DEVOPS', 'MCP_INTEGRATION')),
    status VARCHAR(50) NOT NULL DEFAULT 'INITIALIZING' CHECK (status IN ('INITIALIZING', 'READY', 'BUSY', 'BLOCKED', 'ERROR', 'OFFLINE')),
    current_task_id UUID REFERENCES tasks(id),
    last_heartbeat TIMESTAMP NOT NULL DEFAULT NOW(),
    capabilities JSONB DEFAULT '{}',
    metrics JSONB DEFAULT '{}',
    configuration JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);

CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(type);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

CREATE INDEX IF NOT EXISTS idx_task_dependencies_task_id ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on ON task_dependencies(depends_on_task_id);

CREATE INDEX IF NOT EXISTS idx_task_progress_task_id ON task_progress(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);

CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_path ON project_files(file_path);

CREATE INDEX IF NOT EXISTS idx_agent_status_agent_id ON agent_status(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_status_type ON agent_status(agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_status_status ON agent_status(status);

-- Insert default admin user (password: admin123)
INSERT INTO users (email, name, role, password_hash) VALUES 
('admin@devteam.local', 'Admin User', 'ADMIN', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LlmaxSjekXZlvG.nW')
ON CONFLICT (email) DO NOTHING;

-- Insert default project templates
INSERT INTO project_templates (name, description, category, technologies, complexity) VALUES 
('React Web App', 'Modern React application with TypeScript', 'Frontend', '["react", "typescript", "vite", "tailwindcss"]', 'MEDIUM'),
('Express API', 'RESTful API with Express and TypeScript', 'Backend', '["express", "typescript", "postgresql", "jwt"]', 'MEDIUM'),
('Full Stack App', 'Complete web application with React frontend and Express backend', 'Full Stack', '["react", "express", "typescript", "postgresql"]', 'HIGH'),
('MCP Server', 'Model Context Protocol server implementation', 'Integration', '["typescript", "mcp", "fastify"]', 'LOW')
ON CONFLICT DO NOTHING;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_templates_updated_at BEFORE UPDATE ON project_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_files_updated_at BEFORE UPDATE ON project_files FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agent_status_updated_at BEFORE UPDATE ON agent_status FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
