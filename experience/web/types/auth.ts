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
  assigned_clinician_id?: string;
  preferences?: Record<string, unknown>;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  consent_required?: boolean;
  outstanding_policies?: Array<{
    key: string;
    version: string;
    title: string;
    description: string;
    required: boolean;
  }>;
}

export interface AuthError {
  detail: string;
}
