export class UserService {
  constructor(private database: any, private logger: any) {}

  async getUserById(userId: string) {
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

  async updateUser(userId: string, data: any) {
    const { name, avatar, preferences } = data;
    
    const result = await this.database.query(`
      UPDATE users 
      SET name = COALESCE($2, name), 
          avatar = COALESCE($3, avatar),
          preferences = COALESCE($4, preferences),
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, email, name, role, avatar, created_at, updated_at, preferences, permissions
    `, [userId, name, avatar, preferences]);

    return {
      ...result.rows[0],
      permissions: result.rows[0].permissions || []
    };
  }
}
