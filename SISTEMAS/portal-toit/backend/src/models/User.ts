import { pgPool } from '../config/database';
import bcrypt from 'bcryptjs';

export interface User {
  id?: number;
  cpf: string;
  senha: string;
  perfil: 'ADMIN' | 'TOIT' | 'CLIENTE';
  cliente_key?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface UserSafe {
  id: number;
  cpf: string;
  perfil: string;
  cliente_key?: string;
  created_at?: Date;
}

export class UserModel {
  static async findByCpf(cpf: string): Promise<User | null> {
    try {
      const result = await pgPool.query(
        'SELECT * FROM users WHERE cpf = $1',
        [cpf]
      );
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error finding user by CPF:', error);
      throw error;
    }
  }

  static async findById(id: number): Promise<User | null> {
    try {
      const result = await pgPool.query(
        'SELECT * FROM users WHERE id = $1',
        [id]
      );
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  static async create(userData: Omit<User, 'id'>): Promise<User> {
    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.senha, 12);
      
      const result = await pgPool.query(
        'INSERT INTO users (cpf, senha, perfil, cliente_key) VALUES ($1, $2, $3, $4) RETURNING *',
        [userData.cpf, hashedPassword, userData.perfil, userData.cliente_key || null]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  static async update(id: number, updateData: Partial<User>): Promise<User | null> {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      Object.entries(updateData).forEach(([key, value]) => {
        if (key !== 'id' && value !== undefined) {
          fields.push(`${key} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      });

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      // Add updated_at
      fields.push(`updated_at = $${paramCount}`);
      values.push(new Date());
      paramCount++;

      // Add id for WHERE clause
      values.push(id);

      const query = `
        UPDATE users 
        SET ${fields.join(', ')} 
        WHERE id = $${paramCount} 
        RETURNING *
      `;

      const result = await pgPool.query(query, values);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  static async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      console.error('Error validating password:', error);
      return false;
    }
  }

  static async updatePassword(id: number, newPassword: string): Promise<boolean> {
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      
      const result = await pgPool.query(
        'UPDATE users SET senha = $1, updated_at = $2 WHERE id = $3',
        [hashedPassword, new Date(), id]
      );
      
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error updating password:', error);
      throw error;
    }
  }

  static async delete(id: number): Promise<boolean> {
    try {
      const result = await pgPool.query(
        'DELETE FROM users WHERE id = $1',
        [id]
      );
      
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  static async findAll(limit = 50, offset = 0): Promise<User[]> {
    try {
      const result = await pgPool.query(
        'SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [limit, offset]
      );
      
      return result.rows;
    } catch (error) {
      console.error('Error finding all users:', error);
      throw error;
    }
  }

  static toSafe(user: User): UserSafe {
    const { senha, ...safeUser } = user;
    return safeUser as UserSafe;
  }
}