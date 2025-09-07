import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
  created_at: Date;
  updated_at: Date;
  last_login_at?: Date;
  preferences: any;
  permissions: string[];
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  role?: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export class AuthService {
  constructor(
    private database: any,
    private redis: any,
    private logger: any
  ) {}

  async register(data: RegisterData): Promise<{ user: User; tokens: TokenPair }> {
    const { email, password, name, role = 'DEVELOPER' } = data;

    // Check if user already exists
    const existingUser = await this.database.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      throw new Error('User already exists with this email');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const userId = uuid();
    const userResult = await this.database.query(`
      INSERT INTO users (id, email, name, role, password_hash, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING id, email, name, role, created_at, updated_at, preferences, permissions
    `, [userId, email, name, role, hashedPassword]);

    const user = userResult.rows[0];

    // Generate tokens
    const tokens = await this.generateTokenPair(user.id);

    this.logger.info(`User registered successfully: ${email}`);

    return {
      user: {
        ...user,
        permissions: user.permissions || []
      },
      tokens
    };
  }

  async login(credentials: LoginCredentials): Promise<{ user: User; tokens: TokenPair }> {
    const { email, password } = credentials;

    // Get user with password hash
    const result = await this.database.query(`
      SELECT id, email, name, role, password_hash, avatar, created_at, updated_at, 
             last_login_at, preferences, permissions
      FROM users 
      WHERE email = $1
    `, [email]);

    if (result.rows.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    await this.database.query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    );

    // Generate tokens
    const tokens = await this.generateTokenPair(user.id);

    this.logger.info(`User logged in successfully: ${email}`);

    // Remove password hash from returned user
    delete user.password_hash;

    return {
      user: {
        ...user,
        permissions: user.permissions || []
      },
      tokens
    };
  }

  async refreshToken(refreshToken: string): Promise<TokenPair> {
    // Get refresh token from Redis
    const storedData = await this.redis.get(`refresh_token:${refreshToken}`);
    
    if (!storedData) {
      throw new Error('Invalid or expired refresh token');
    }

    const tokenData = JSON.parse(storedData);
    
    // Check if token is expired
    if (new Date() > new Date(tokenData.expiresAt)) {
      await this.redis.del(`refresh_token:${refreshToken}`);
      throw new Error('Refresh token expired');
    }

    // Generate new token pair
    const newTokens = await this.generateTokenPair(tokenData.userId);

    // Remove old refresh token
    await this.redis.del(`refresh_token:${refreshToken}`);

    this.logger.info(`Token refreshed for user: ${tokenData.userId}`);

    return newTokens;
  }

  async logout(refreshToken: string): Promise<void> {
    // Remove refresh token from Redis
    await this.redis.del(`refresh_token:${refreshToken}`);
    this.logger.info('User logged out successfully');
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    // Get current password hash
    const result = await this.database.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    const currentHash = result.rows[0].password_hash;

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, currentHash);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const newHashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await this.database.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newHashedPassword, userId]
    );

    // Invalidate all refresh tokens for this user
    const keys = await this.redis.keys(`refresh_token:*`);
    for (const key of keys) {
      const tokenData = await this.redis.get(key);
      if (tokenData) {
        const parsed = JSON.parse(tokenData);
        if (parsed.userId === userId) {
          await this.redis.del(key);
        }
      }
    }

    this.logger.info(`Password changed for user: ${userId}`);
  }

  async requestPasswordReset(email: string): Promise<string> {
    // Check if user exists
    const result = await this.database.query(
      'SELECT id, name FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      // Don't reveal if email exists or not
      return 'If an account exists with this email, a password reset link will be sent.';
    }

    const user = result.rows[0];
    const resetToken = uuid();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    // Store reset token in Redis
    await this.redis.setEx(`password_reset:${resetToken}`, 3600, JSON.stringify({
      userId: user.id,
      email,
      expiresAt
    }));

    this.logger.info(`Password reset requested for user: ${email}`);

    return resetToken; // In real app, this would be sent via email
  }

  async resetPassword(resetToken: string, newPassword: string): Promise<void> {
    // Get reset token data
    const storedData = await this.redis.get(`password_reset:${resetToken}`);
    
    if (!storedData) {
      throw new Error('Invalid or expired reset token');
    }

    const tokenData = JSON.parse(storedData);

    // Check if token is expired
    if (new Date() > new Date(tokenData.expiresAt)) {
      await this.redis.del(`password_reset:${resetToken}`);
      throw new Error('Reset token expired');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await this.database.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, tokenData.userId]
    );

    // Remove reset token
    await this.redis.del(`password_reset:${resetToken}`);

    // Invalidate all refresh tokens for this user
    const keys = await this.redis.keys(`refresh_token:*`);
    for (const key of keys) {
      const refreshTokenData = await this.redis.get(key);
      if (refreshTokenData) {
        const parsed = JSON.parse(refreshTokenData);
        if (parsed.userId === tokenData.userId) {
          await this.redis.del(key);
        }
      }
    }

    this.logger.info(`Password reset completed for user: ${tokenData.userId}`);
  }

  private async generateTokenPair(userId: string): Promise<TokenPair> {
    const refreshToken = uuid();
    const accessTokenPayload = {
      userId,
      type: 'access'
    };

    // Generate access token (short-lived)
    const accessToken = await this.generateJWT(accessTokenPayload, '15m');
    
    // Store refresh token in Redis (long-lived)
    const refreshTokenExpiry = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days
    await this.redis.setEx(`refresh_token:${refreshToken}`, 604800, JSON.stringify({
      userId,
      expiresAt: refreshTokenExpiry
    }));

    return {
      accessToken,
      refreshToken,
      expiresAt: new Date(Date.now() + 1000 * 60 * 15) // 15 minutes
    };
  }

  private async generateJWT(payload: any, expiresIn: string): Promise<string> {
    // This would use the fastify JWT instance in a real implementation
    // For now, return a mock token structure
    return `mock.jwt.token.${Date.now()}`;
  }

  async validateSession(userId: string): Promise<User | null> {
    const result = await this.database.query(`
      SELECT id, email, name, role, avatar, created_at, updated_at, 
             last_login_at, preferences, permissions
      FROM users 
      WHERE id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    return {
      ...result.rows[0],
      permissions: result.rows[0].permissions || []
    };
  }
}
