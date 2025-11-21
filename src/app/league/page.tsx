import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth-utils';

export default async function LeaguePage() {
  const user = await requireAdmin();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold text-primary-600">
              League Dashboard
            </h1>
            <a href="/" className="text-primary-600 hover:text-primary-700">
              ← Back to Home
            </a>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-4">League Overview</h2>
            <p className="text-gray-600">
              View aggregated statistics, standings, and activity across all leagues.
            </p>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-600 mb-2">
                  Total Quizzes
                </h3>
                <p className="text-3xl font-bold text-primary-600">-</p>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-600 mb-2">
                  Active Sessions
                </h3>
                <p className="text-3xl font-bold text-green-600">-</p>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-600 mb-2">
                  Total Players
                </h3>
                <p className="text-3xl font-bold text-purple-600">-</p>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-4">League Standings</h2>
            <p className="text-gray-500 text-center py-8">
              League standings will be displayed here based on completed games.
            </p>
          </section>

          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-4">Recent Activity</h2>
            <p className="text-gray-500 text-center py-8">
              Recent league activity and game completions will appear here.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
