export enum UserRole {
  ADMIN = "admin",
  CLINICIAN = "clinician",
  USER = "user",
}

export interface User {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface AuthError {
  detail: string;
}
