-- Workflow System Schema
-- Complete workflow engine with parallel execution, conditionals, and templates

-- Workflow definitions
CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'DEPRECATED', 'ARCHIVED')),
    config JSONB DEFAULT '{}',
    variables JSONB DEFAULT '{}',
    triggers JSONB DEFAULT '[]',
    hooks JSONB DEFAULT '{}',
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(name, project_id, version)
);

CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflows_project_id ON workflows(project_id);
CREATE INDEX IF NOT EXISTS idx_workflows_owner_id ON workflows(owner_id);

-- Workflow steps
CREATE TABLE IF NOT EXISTS workflow_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    step_order INTEGER NOT NULL,
    step_type VARCHAR(50) NOT NULL CHECK (step_type IN ('TASK', 'PARALLEL', 'CONDITIONAL', 'WAIT', 'APPROVAL', 'WEBHOOK', 'SCRIPT')),
    agent_type VARCHAR(100),
    task_config JSONB DEFAULT '{}',
    retry_policy JSONB DEFAULT '{"maxRetries": 3, "retryDelayMs": 5000, "backoffMultiplier": 2}',
    timeout_ms INTEGER DEFAULT 3600000,
    condition JSONB,
    on_success VARCHAR(100),
    on_failure VARCHAR(100),
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workflow_id, name)
);

CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow_id ON workflow_steps(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_step_type ON workflow_steps(step_type);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_order ON workflow_steps(workflow_id, step_order);

-- Step dependencies (for parallel execution control)
CREATE TABLE IF NOT EXISTS workflow_step_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    step_id UUID NOT NULL REFERENCES workflow_steps(id) ON DELETE CASCADE,
    depends_on_step_id UUID NOT NULL REFERENCES workflow_steps(id) ON DELETE CASCADE,
    dependency_type VARCHAR(50) DEFAULT 'FINISH_TO_START' CHECK (dependency_type IN ('FINISH_TO_START', 'START_TO_START', 'FINISH_TO_FINISH')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(step_id, depends_on_step_id)
);

CREATE INDEX IF NOT EXISTS idx_workflow_step_dependencies_step_id ON workflow_step_dependencies(step_id);
CREATE INDEX IF NOT EXISTS idx_workflow_step_dependencies_depends_on ON workflow_step_dependencies(depends_on_step_id);

-- Workflow executions (instances of workflow runs)
CREATE TABLE IF NOT EXISTS workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'PAUSED', 'WAITING_APPROVAL', 'COMPLETED', 'FAILED', 'CANCELLED')),
    trigger_type VARCHAR(50) CHECK (trigger_type IN ('MANUAL', 'SCHEDULED', 'EVENT', 'API', 'WEBHOOK')),
    triggered_by UUID REFERENCES users(id) ON DELETE SET NULL,
    input_variables JSONB DEFAULT '{}',
    output_variables JSONB DEFAULT '{}',
    context JSONB DEFAULT '{}',
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    current_step_id UUID REFERENCES workflow_steps(id) ON DELETE SET NULL,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_triggered_by ON workflow_executions(triggered_by);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_created_at ON workflow_executions(created_at);

-- Step executions (individual step runs within a workflow execution)
CREATE TABLE IF NOT EXISTS workflow_step_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES workflow_steps(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'WAITING', 'COMPLETED', 'FAILED', 'SKIPPED', 'CANCELLED')),
    assigned_agent_id VARCHAR(100),
    task_id VARCHAR(100),
    input_data JSONB DEFAULT '{}',
    output_data JSONB DEFAULT '{}',
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(execution_id, step_id)
);

CREATE INDEX IF NOT EXISTS idx_workflow_step_executions_execution_id ON workflow_step_executions(execution_id);
CREATE INDEX IF NOT EXISTS idx_workflow_step_executions_step_id ON workflow_step_executions(step_id);
CREATE INDEX IF NOT EXISTS idx_workflow_step_executions_status ON workflow_step_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_step_executions_task_id ON workflow_step_executions(task_id);

-- Workflow templates (pre-built workflow patterns)
CREATE TABLE IF NOT EXISTS workflow_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(100) CHECK (category IN ('CI_CD', 'TESTING', 'DEVELOPMENT', 'DEPLOYMENT', 'MAINTENANCE', 'CUSTOM')),
    workflow_definition JSONB NOT NULL,
    variables_schema JSONB DEFAULT '{}',
    icon VARCHAR(50),
    is_system BOOLEAN DEFAULT FALSE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_templates_category ON workflow_templates(category);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_is_system ON workflow_templates(is_system);

-- Workflow approvals (for approval gate steps)
CREATE TABLE IF NOT EXISTS workflow_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    step_execution_id UUID NOT NULL REFERENCES workflow_step_executions(id) ON DELETE CASCADE,
    approver_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED')),
    comments TEXT,
    approved_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_approvals_step_execution_id ON workflow_approvals(step_execution_id);
CREATE INDEX IF NOT EXISTS idx_workflow_approvals_approver_id ON workflow_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_workflow_approvals_status ON workflow_approvals(status);

-- Trigger for updating updated_at timestamps
CREATE TRIGGER update_workflows_updated_at
    BEFORE UPDATE ON workflows
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_steps_updated_at
    BEFORE UPDATE ON workflow_steps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_executions_updated_at
    BEFORE UPDATE ON workflow_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_step_executions_updated_at
    BEFORE UPDATE ON workflow_step_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_templates_updated_at
    BEFORE UPDATE ON workflow_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate workflow progress
CREATE OR REPLACE FUNCTION calculate_workflow_progress(p_execution_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_total INTEGER;
    v_completed INTEGER;
BEGIN
    SELECT COUNT(*), COUNT(*) FILTER (WHERE status IN ('COMPLETED', 'SKIPPED'))
    INTO v_total, v_completed
    FROM workflow_step_executions
    WHERE execution_id = p_execution_id;

    IF v_total = 0 THEN
        RETURN 0;
    END IF;

    RETURN ROUND((v_completed::DECIMAL / v_total) * 100);
END;
$$ LANGUAGE plpgsql;

-- Function to get next executable steps
CREATE OR REPLACE FUNCTION get_next_workflow_steps(p_execution_id UUID)
RETURNS TABLE(step_id UUID, step_name VARCHAR, step_type VARCHAR) AS $$
BEGIN
    RETURN QUERY
    SELECT ws.id, ws.name, ws.step_type
    FROM workflow_steps ws
    JOIN workflow_executions we ON we.workflow_id = ws.workflow_id
    LEFT JOIN workflow_step_executions wse ON wse.step_id = ws.id AND wse.execution_id = p_execution_id
    WHERE we.id = p_execution_id
      AND ws.enabled = TRUE
      AND (wse.id IS NULL OR wse.status = 'PENDING')
      AND NOT EXISTS (
          -- Check that all dependencies are completed
          SELECT 1 FROM workflow_step_dependencies wsd
          JOIN workflow_step_executions dep_exec ON dep_exec.step_id = wsd.depends_on_step_id
          WHERE wsd.step_id = ws.id
            AND dep_exec.execution_id = p_execution_id
            AND dep_exec.status NOT IN ('COMPLETED', 'SKIPPED')
      )
    ORDER BY ws.step_order;
END;
$$ LANGUAGE plpgsql;

-- Insert default workflow templates
INSERT INTO workflow_templates (name, description, category, workflow_definition, variables_schema, icon, is_system)
VALUES
-- CI/CD Pipeline Template
('CI/CD Pipeline', 'Standard continuous integration and deployment pipeline with code review, build, test, and deploy stages', 'CI_CD', '{
    "name": "CI/CD Pipeline",
    "steps": [
        {
            "name": "Code Review",
            "step_type": "TASK",
            "agent_type": "ARCHITECTURE_LEAD",
            "task_config": {
                "type": "CODE_REVIEW",
                "title": "Review code changes",
                "description": "Review code for quality, security, and best practices"
            }
        },
        {
            "name": "Build",
            "step_type": "PARALLEL",
            "substeps": [
                {
                    "name": "Frontend Build",
                    "agent_type": "FRONTEND_CORE",
                    "task_config": {"type": "DEPLOYMENT", "title": "Build frontend assets"}
                },
                {
                    "name": "Backend Build",
                    "agent_type": "BACKEND_INTEGRATION",
                    "task_config": {"type": "DEPLOYMENT", "title": "Build backend services"}
                }
            ]
        },
        {
            "name": "Test",
            "step_type": "TASK",
            "agent_type": "QUALITY_ASSURANCE",
            "task_config": {
                "type": "TESTING",
                "title": "Run test suite",
                "description": "Execute unit, integration, and e2e tests"
            }
        },
        {
            "name": "Deploy",
            "step_type": "TASK",
            "agent_type": "DEVOPS",
            "task_config": {
                "type": "DEPLOYMENT",
                "title": "Deploy to environment",
                "description": "Deploy built artifacts to target environment"
            }
        }
    ]
}', '{
    "properties": {
        "environment": {"type": "string", "enum": ["development", "staging", "production"], "default": "development"},
        "skip_tests": {"type": "boolean", "default": false}
    }
}', 'rocket', TRUE),

-- Testing Suite Template
('Testing Suite', 'Comprehensive testing workflow from code analysis through all test levels', 'TESTING', '{
    "name": "Testing Suite",
    "steps": [
        {
            "name": "Code Analysis",
            "step_type": "TASK",
            "agent_type": "QUALITY_ASSURANCE",
            "task_config": {
                "type": "CODE_REVIEW",
                "title": "Static code analysis",
                "description": "Run linting, type checking, and security analysis"
            }
        },
        {
            "name": "Unit Tests",
            "step_type": "TASK",
            "agent_type": "QUALITY_ASSURANCE",
            "task_config": {
                "type": "TESTING",
                "title": "Run unit tests",
                "description": "Execute unit tests with coverage reporting"
            }
        },
        {
            "name": "Integration Tests",
            "step_type": "TASK",
            "agent_type": "QUALITY_ASSURANCE",
            "task_config": {
                "type": "TESTING",
                "title": "Run integration tests",
                "description": "Test component integrations and API contracts"
            }
        },
        {
            "name": "E2E Tests",
            "step_type": "TASK",
            "agent_type": "QUALITY_ASSURANCE",
            "task_config": {
                "type": "TESTING",
                "title": "Run end-to-end tests",
                "description": "Execute full user flow tests"
            }
        },
        {
            "name": "Generate Report",
            "step_type": "TASK",
            "agent_type": "QUALITY_ASSURANCE",
            "task_config": {
                "type": "DOCUMENTATION",
                "title": "Generate test report",
                "description": "Compile test results and coverage into report"
            }
        }
    ]
}', '{
    "properties": {
        "test_files": {"type": "string", "description": "Glob pattern for test files"},
        "coverage_threshold": {"type": "number", "minimum": 0, "maximum": 100, "default": 80}
    }
}', 'check-circle', TRUE),

-- Full Stack Development Template
('Full Stack Development', 'Complete development workflow from architecture through QA and documentation', 'DEVELOPMENT', '{
    "name": "Full Stack Development",
    "steps": [
        {
            "name": "Architecture Design",
            "step_type": "TASK",
            "agent_type": "ARCHITECTURE_LEAD",
            "task_config": {
                "type": "FOUNDATION",
                "title": "Design system architecture",
                "description": "Create technical design and architecture documentation"
            }
        },
        {
            "name": "Approval Gate",
            "step_type": "APPROVAL",
            "task_config": {
                "title": "Architecture Approval",
                "description": "Review and approve architecture design before development"
            }
        },
        {
            "name": "Development",
            "step_type": "PARALLEL",
            "substeps": [
                {
                    "name": "Backend Development",
                    "agent_type": "BACKEND_INTEGRATION",
                    "task_config": {"type": "CODE_GENERATION", "title": "Implement backend services"}
                },
                {
                    "name": "Frontend Development",
                    "agent_type": "FRONTEND_CORE",
                    "task_config": {"type": "UI_DEVELOPMENT", "title": "Implement frontend components"}
                }
            ]
        },
        {
            "name": "Integration",
            "step_type": "TASK",
            "agent_type": "BACKEND_INTEGRATION",
            "task_config": {
                "type": "INTEGRATION",
                "title": "Integrate frontend and backend",
                "description": "Connect frontend to backend APIs and test integration"
            }
        },
        {
            "name": "Quality Assurance",
            "step_type": "TASK",
            "agent_type": "QUALITY_ASSURANCE",
            "task_config": {
                "type": "TESTING",
                "title": "QA testing",
                "description": "Comprehensive testing and bug identification"
            }
        },
        {
            "name": "Documentation",
            "step_type": "TASK",
            "agent_type": "ARCHITECTURE_LEAD",
            "task_config": {
                "type": "DOCUMENTATION",
                "title": "Write documentation",
                "description": "Create user and technical documentation"
            }
        }
    ]
}', '{
    "properties": {
        "feature_name": {"type": "string", "description": "Name of the feature being developed"},
        "priority": {"type": "string", "enum": ["LOW", "MEDIUM", "HIGH", "CRITICAL"], "default": "MEDIUM"}
    }
}', 'code', TRUE)

ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    workflow_definition = EXCLUDED.workflow_definition,
    variables_schema = EXCLUDED.variables_schema,
    updated_at = NOW();
