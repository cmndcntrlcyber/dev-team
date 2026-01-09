import { FastifyRequest, FastifyReply } from 'fastify';

export class ProjectController {
  constructor(private fastify: any) {}

  async listProjects(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Implementation placeholder
      const projects = await this.fastify.db.query(
        'SELECT * FROM projects ORDER BY created_at DESC'
      );
      
      return reply.send({
        success: true,
        data: projects.rows,
        meta: { total: projects.rows.length }
      });
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch projects' }
      });
    }
  }

  async getProject(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    
    try {
      const result = await this.fastify.db.query(
        'SELECT * FROM projects WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Project not found' }
        });
      }
      
      return reply.send({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch project' }
      });
    }
  }

  async createProject(request: FastifyRequest, reply: FastifyReply) {
    const body = request.body as {
      name: string;
      description?: string;
      template_id?: string;
      status?: string;
      owner_id?: string;
      tags?: string[];
      metadata?: Record<string, unknown>;
    };

    // Validate required fields
    if (!body.name || body.name.trim() === '') {
      return reply.code(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Project name is required' }
      });
    }

    try {
      // Get owner_id from request or use default admin user
      let ownerId = body.owner_id;
      if (!ownerId) {
        const defaultUser = await this.fastify.db.query(
          'SELECT id FROM users LIMIT 1'
        );
        if (defaultUser.rows.length === 0) {
          return reply.code(400).send({
            success: false,
            error: { code: 'NO_USER', message: 'No users exist. Create a user first.' }
          });
        }
        ownerId = defaultUser.rows[0].id;
      }

      const result = await this.fastify.db.query(
        `INSERT INTO projects (name, description, template_id, status, owner_id, tags, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          body.name.trim(),
          body.description || '',
          body.template_id || null,
          body.status || 'PLANNING',
          ownerId,
          JSON.stringify(body.tags || []),
          JSON.stringify(body.metadata || {})
        ]
      );

      return reply.code(201).send({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      this.fastify.log.error('Failed to create project:', error);
      return reply.code(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create project' }
      });
    }
  }

  async updateProject(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;

    // Define allowed fields for update
    const allowedFields = ['name', 'description', 'template_id', 'status', 'tags', 'metadata', 'configuration', 'due_date'];
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        // Handle JSON fields
        if (['tags', 'metadata', 'configuration'].includes(field)) {
          updates.push(`${field} = $${paramIndex}`);
          values.push(JSON.stringify(body[field]));
        } else {
          updates.push(`${field} = $${paramIndex}`);
          values.push(body[field]);
        }
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return reply.code(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'No valid fields to update' }
      });
    }

    try {
      // Add id as the last parameter
      values.push(id);

      const result = await this.fastify.db.query(
        `UPDATE projects SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Project not found' }
        });
      }

      return reply.send({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      this.fastify.log.error('Failed to update project:', error);
      return reply.code(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update project' }
      });
    }
  }

  async deleteProject(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };

    try {
      const result = await this.fastify.db.query(
        'DELETE FROM projects WHERE id = $1 RETURNING id',
        [id]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Project not found' }
        });
      }

      return reply.send({
        success: true,
        data: { id: result.rows[0].id, message: 'Project deleted successfully' }
      });
    } catch (error) {
      this.fastify.log.error('Failed to delete project:', error);
      return reply.code(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete project' }
      });
    }
  }

  async getProjectFiles(request: FastifyRequest, reply: FastifyReply) {
    // Implementation placeholder
    return reply.send({
      success: true,
      data: []
    });
  }

  async exportProject(request: FastifyRequest, reply: FastifyReply) {
    // Implementation placeholder
    return reply.send({
      success: true,
      data: { exportUrl: 'http://example.com/export.zip' }
    });
  }
}
