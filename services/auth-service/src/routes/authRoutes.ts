export async function authRoutes(fastify: any) {
  // POST /api/auth/register
  fastify.post('/register', async (request: any, reply: any) => {
    try {
      const result = await request.server.authService.register(request.body);
      return reply.code(201).send({
        success: true,
        data: result
      });
    } catch (error: any) {
      return reply.code(400).send({
        success: false,
        error: { code: 'REGISTRATION_FAILED', message: error.message }
      });
    }
  });

  // POST /api/auth/login
  fastify.post('/login', async (request: any, reply: any) => {
    try {
      const result = await request.server.authService.login(request.body);
      return reply.send({
        success: true,
        data: result
      });
    } catch (error: any) {
      return reply.code(401).send({
        success: false,
        error: { code: 'LOGIN_FAILED', message: error.message }
      });
    }
  });

  // POST /api/auth/refresh
  fastify.post('/refresh', async (request: any, reply: any) => {
    try {
      const { refreshToken } = request.body;
      const result = await request.server.authService.refreshToken(refreshToken);
      return reply.send({
        success: true,
        data: result
      });
    } catch (error: any) {
      return reply.code(401).send({
        success: false,
        error: { code: 'TOKEN_REFRESH_FAILED', message: error.message }
      });
    }
  });

  // POST /api/auth/logout
  fastify.post('/logout', async (request: any, reply: any) => {
    try {
      const { refreshToken } = request.body;
      await request.server.authService.logout(refreshToken);
      return reply.send({
        success: true,
        data: { message: 'Logged out successfully' }
      });
    } catch (error: any) {
      return reply.code(400).send({
        success: false,
        error: { code: 'LOGOUT_FAILED', message: error.message }
      });
    }
  });

  // POST /api/auth/change-password
  fastify.post('/change-password', async (request: any, reply: any) => {
    try {
      // This would require authentication middleware in real implementation
      const { userId, currentPassword, newPassword } = request.body;
      await request.server.authService.changePassword(userId, currentPassword, newPassword);
      return reply.send({
        success: true,
        data: { message: 'Password changed successfully' }
      });
    } catch (error: any) {
      return reply.code(400).send({
        success: false,
        error: { code: 'PASSWORD_CHANGE_FAILED', message: error.message }
      });
    }
  });

  // POST /api/auth/forgot-password
  fastify.post('/forgot-password', async (request: any, reply: any) => {
    try {
      const { email } = request.body;
      const result = await request.server.authService.requestPasswordReset(email);
      return reply.send({
        success: true,
        data: { message: result }
      });
    } catch (error: any) {
      return reply.code(400).send({
        success: false,
        error: { code: 'PASSWORD_RESET_REQUEST_FAILED', message: error.message }
      });
    }
  });

  // POST /api/auth/reset-password
  fastify.post('/reset-password', async (request: any, reply: any) => {
    try {
      const { resetToken, newPassword } = request.body;
      await request.server.authService.resetPassword(resetToken, newPassword);
      return reply.send({
        success: true,
        data: { message: 'Password reset successfully' }
      });
    } catch (error: any) {
      return reply.code(400).send({
        success: false,
        error: { code: 'PASSWORD_RESET_FAILED', message: error.message }
      });
    }
  });
}
