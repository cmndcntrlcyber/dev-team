-- Agent Management Schema Extensions
-- Adds columns for API-managed agent configurations

-- Ensure agents table has all needed columns for CRUD management
ALTER TABLE agents ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMPTZ;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS metrics JSONB DEFAULT '{}';

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_agents_enabled ON agents(enabled);
CREATE INDEX IF NOT EXISTS idx_agents_priority ON agents(priority);
CREATE INDEX IF NOT EXISTS idx_agents_owner_id ON agents(owner_id);
CREATE INDEX IF NOT EXISTS idx_agents_last_heartbeat ON agents(last_heartbeat);

-- Create agent_configurations table for detailed configuration storage
CREATE TABLE IF NOT EXISTS agent_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id VARCHAR(100) NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    config_key VARCHAR(100) NOT NULL,
    config_value JSONB NOT NULL,
    is_secret BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agent_id, config_key)
);

CREATE INDEX IF NOT EXISTS idx_agent_configurations_agent_id ON agent_configurations(agent_id);

-- Create agent_audit_log table for tracking agent lifecycle events
CREATE TABLE IF NOT EXISTS agent_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('CREATED', 'UPDATED', 'ENABLED', 'DISABLED', 'DELETED', 'REGISTERED', 'UNREGISTERED', 'HEARTBEAT_MISSED')),
    performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_audit_log_agent_id ON agent_audit_log(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_audit_log_action ON agent_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_agent_audit_log_created_at ON agent_audit_log(created_at);

-- Trigger to update updated_at on agent_configurations
CREATE TRIGGER update_agent_configurations_updated_at
    BEFORE UPDATE ON agent_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to log agent actions
CREATE OR REPLACE FUNCTION log_agent_action(
    p_agent_id VARCHAR(100),
    p_action VARCHAR(50),
    p_performed_by UUID DEFAULT NULL,
    p_details JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO agent_audit_log (agent_id, action, performed_by, details)
    VALUES (p_agent_id, p_action, p_performed_by, p_details)
    RETURNING id INTO v_log_id;
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;
