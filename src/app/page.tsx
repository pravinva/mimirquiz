import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth-utils';
import Link from 'next/link';

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold text-primary-600">
              MIMIR Quiz Platform
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {user.name} ({user.role})
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to MIMIR Quiz
          </h2>
          <p className="text-lg text-gray-600">
            Voice-powered quiz platform for competitive gameplay
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            href="/game"
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <h3 className="text-xl font-semibold mb-2 text-primary-600">
              Play Quiz
            </h3>
            <p className="text-gray-600">
              Start a new quiz game or join an existing session
            </p>
          </Link>

          <Link
            href="/lobby"
            className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow text-white"
          >
            <h3 className="text-xl font-semibold mb-2">
              Multiplayer Quiz 🎮
            </h3>
            <p>
              Play with up to 4 friends! Each player uses their own microphone
            </p>
          </Link>

          <Link
            href="/dashboard"
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <h3 className="text-xl font-semibold mb-2 text-primary-600">
              My Dashboard
            </h3>
            <p className="text-gray-600">
              View your quiz history, scores, and performance
            </p>
          </Link>

          {(user.role === 'admin' || user.role === 'league_admin') && (
            <>
              <Link
                href="/admin"
                className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
              >
                <h3 className="text-xl font-semibold mb-2 text-primary-600">
                  Admin Panel
                </h3>
                <p className="text-gray-600">
                  Upload quizzes, manage sessions, and view audit logs
                </p>
              </Link>

              <Link
                href="/league"
                className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
              >
                <h3 className="text-xl font-semibold mb-2 text-primary-600">
                  League Dashboard
                </h3>
                <p className="text-gray-600">
                  View league statistics, standings, and activity
                </p>
              </Link>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
