import { FastifyInstance } from 'fastify';
import { ProjectController } from '../controllers/ProjectController';

export async function projectRoutes(fastify: FastifyInstance) {
  const projectController = new ProjectController(fastify);

  // GET /api/projects - List all projects
  fastify.get('/', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', minimum: 1, default: 1 },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
          status: { type: 'string', enum: ['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] },
          ownerId: { type: 'string' }
        }
      }
    }
  }, projectController.listProjects.bind(projectController));

  // GET /api/projects/:id - Get project by ID
  fastify.get('/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      }
    }
  }, projectController.getProject.bind(projectController));

  // POST /api/projects - Create new project
  fastify.post('/', {
    schema: {
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 255 },
          description: { type: 'string', maxLength: 1000 },
          templateId: { type: 'string', format: 'uuid' },
          tags: { type: 'array', items: { type: 'string' } },
          metadata: { type: 'object' }
        },
        required: ['name']
      }
    }
  }, projectController.createProject.bind(projectController));

  // PUT /api/projects/:id - Update project
  fastify.put('/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 255 },
          description: { type: 'string', maxLength: 1000 },
          status: { type: 'string', enum: ['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] },
          tags: { type: 'array', items: { type: 'string' } },
          metadata: { type: 'object' }
        }
      }
    }
  }, projectController.updateProject.bind(projectController));

  // DELETE /api/projects/:id - Delete project
  fastify.delete('/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      }
    }
  }, projectController.deleteProject.bind(projectController));

  // GET /api/projects/:id/files - List project files
  fastify.get('/:id/files', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      }
    }
  }, projectController.getProjectFiles.bind(projectController));

  // POST /api/projects/:id/export - Export project
  fastify.post('/:id/export', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      }
    }
  }, projectController.exportProject.bind(projectController));
}
