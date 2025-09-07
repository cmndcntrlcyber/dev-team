export async function fileRoutes(fastify: any) {
  fastify.get('/', async (request: any, reply: any) => {
    return reply.send({ success: true, data: [] });
  });
}
