import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth-utils';
import PlayerStats from '@/components/PlayerStats';

export default async function DashboardPage() {
  const user = await requireAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold text-primary-600">My Dashboard</h1>
            <a href="/" className="text-primary-600 hover:text-primary-700">
              ← Back to Home
            </a>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900">
            Welcome, {user.name}!
          </h2>
          <p className="text-gray-600 mt-2">
            Track your quiz performance and history
          </p>
        </div>

        <PlayerStats />
      </main>
    </div>
  );
}
