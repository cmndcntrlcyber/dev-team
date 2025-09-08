import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthenticatedRequest, JWTPayload } from '../types';

export async function authenticationMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const token = extractToken(request);
    
    if (!token) {
      return reply.code(401).send({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authentication token is required'
        }
      });
    }

    // Verify JWT token
    const decoded = await request.jwtVerify() as JWTPayload;
    
    // Attach user to request
    (request as AuthenticatedRequest).user = {
      id: decoded.userId || decoded.sub || '',
      email: decoded.email || '',
      role: decoded.role || 'USER',
      permissions: decoded.permissions || []
    };
    
  } catch (error) {
    return reply.code(401).send({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired authentication token'
      }
    });
  }
}

export function extractToken(request: FastifyRequest): string | null {
  const authHeader = request.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Check query parameter as fallback
  const token = request.query as any;
  if (token?.access_token) {
    return token.access_token;
  }
  
  return null;
}

export function isPublicPath(path: string, publicPaths: string[]): boolean {
  return publicPaths.some(publicPath => {
    if (publicPath.endsWith('/*')) {
      const basePath = publicPath.slice(0, -2);
      return path.startsWith(basePath);
    }
    return path === publicPath || path.startsWith(publicPath + '/');
  });
}

export async function roleBasedAuth(
  requiredRole: string,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<boolean> {
  const user = (request as AuthenticatedRequest).user;
  
  if (!user) {
    reply.code(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
      }
    });
    return false;
  }
  
  const roleHierarchy = ['VIEWER', 'DEVELOPER', 'ADMIN'];
  const userRoleIndex = roleHierarchy.indexOf(user.role);
  const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);
  
  if (userRoleIndex < requiredRoleIndex) {
    reply.code(403).send({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Insufficient permissions'
      }
    });
    return false;
  }
  
  return true;
}

export function permissionCheck(
  requiredPermission: string,
  request: FastifyRequest,
  reply: FastifyReply
): boolean {
  const user = (request as AuthenticatedRequest).user;
  
  if (!user) {
    reply.code(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
      }
    });
    return false;
  }
  
  if (!user.permissions.includes(requiredPermission)) {
    reply.code(403).send({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Permission denied'
      }
    });
    return false;
  }
  
  return true;
}
