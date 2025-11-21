import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth-utils';
import AdminUploadForm from '@/components/AdminUploadForm';
import QuizLibrary from '@/components/QuizLibrary';

export default async function AdminPage() {
  const user = await requireAdmin();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold text-primary-600">Admin Panel</h1>
            <a href="/" className="text-primary-600 hover:text-primary-700">
              ← Back to Home
            </a>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">Upload Quiz File</h2>
            <AdminUploadForm />
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Quiz Library</h2>
            <QuizLibrary />
          </section>
        </div>
      </main>
    </div>
  );
}
