export async function userRoutes(fastify: any) {
  // GET /api/users/me
  fastify.get('/me', async (request: any, reply: any) => {
    try {
      // This would require authentication middleware in real implementation
      const { userId } = request.query;
      const user = await request.server.userService.getUserById(userId);
      
      if (!user) {
        return reply.code(404).send({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' }
        });
      }
      
      return reply.send({
        success: true,
        data: user
      });
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message }
      });
    }
  });

  // PUT /api/users/me
  fastify.put('/me', async (request: any, reply: any) => {
    try {
      const { userId } = request.body;
      const updatedUser = await request.server.userService.updateUser(userId, request.body);
      
      return reply.send({
        success: true,
        data: updatedUser
      });
    } catch (error: any) {
      return reply.code(400).send({
        success: false,
        error: { code: 'UPDATE_FAILED', message: error.message }
      });
    }
  });
}
