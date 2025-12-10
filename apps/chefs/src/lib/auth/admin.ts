import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../database.types';

export interface AdminAuthResult {
  authorized: boolean;
  user?: {
    id: string;
    email: string;
  };
  error?: string;
}

export async function verifyAdminAuth(request: NextRequest): Promise<AdminAuthResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return {
      authorized: false,
      error: 'Server configuration error: missing Supabase credentials',
    };
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      authorized: false,
      error: 'Missing or invalid authorization header',
    };
  }

  const token = authHeader.substring(7);
  
  const supabase = createClient<Database>(supabaseUrl, supabaseKey);

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return {
      authorized: false,
      error: error?.message || 'Invalid or expired token',
    };
  }

  return {
    authorized: true,
    user: {
      id: user.id,
      email: user.email || 'unknown',
    },
  };
}

export function createUnauthorizedResponse(error?: string) {
  return new Response(
    JSON.stringify({ 
      error: error || 'Unauthorized',
      message: 'Admin authentication required',
    }),
    {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

export function createForbiddenResponse(message?: string) {
  return new Response(
    JSON.stringify({ 
      error: 'Forbidden',
      message: message || 'Insufficient permissions',
    }),
    {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

export function createBadRequestResponse(message: string, details?: unknown) {
  return new Response(
    JSON.stringify({ 
      error: 'Bad Request',
      message,
      details,
    }),
    {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

export function createServerErrorResponse(message: string, details?: unknown) {
  return new Response(
    JSON.stringify({ 
      error: 'Internal Server Error',
      message,
      details,
    }),
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

export function createSuccessResponse(data: unknown, status: number = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
