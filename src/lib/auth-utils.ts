import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { redirect } from 'next/navigation';

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== 'admin' && user.role !== 'league_admin') {
    redirect('/dashboard');
  }
  return user;
}

export function hasRole(user: { role: string } | undefined, roles: string[]): boolean {
  return user ? roles.includes(user.role) : false;
}
