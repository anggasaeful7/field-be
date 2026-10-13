import { Request } from 'express';

export type UserRole = 'admin' | 'pelapor' | 'approver';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}
