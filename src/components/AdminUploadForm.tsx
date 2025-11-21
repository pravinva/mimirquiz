'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminUploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState({
    author: '',
    topic: '',
    league: '',
    description: '',
  });
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.xlsx')) {
        setError('Please select an XLSX file');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!file) {
      setError('Please select a file');
      return;
    }

    if (!metadata.author || !metadata.topic || !metadata.league) {
      setError('Please fill in all required fields');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('metadata', JSON.stringify(metadata));

      const response = await fetch('/api/quizzes/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(
          `Quiz uploaded successfully! ${data.quizFile.totalQuestions} questions in ${data.quizFile.totalRounds} rounds.`
        );
        setFile(null);
        setMetadata({ author: '', topic: '', league: '', description: '' });
        router.refresh();
      } else {
        const data = await response.json();
        setError(data.error || 'Upload failed');
      }
    } catch (err) {
      setError('An error occurred during upload');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-2">
            XLSX File <span className="text-red-500">*</span>
          </label>
          <input
            type="file"
            accept=".xlsx"
            onChange={handleFileChange}
            className="w-full border border-gray-300 rounded-md p-2"
          />
          <p className="text-xs text-gray-500 mt-1">
            Must include columns: round, player, question, answer
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Author <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={metadata.author}
              onChange={(e) =>
                setMetadata({ ...metadata, author: e.target.value })
              }
              className="w-full border border-gray-300 rounded-md p-2"
              placeholder="Quiz author name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Topic <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={metadata.topic}
              onChange={(e) =>
                setMetadata({ ...metadata, topic: e.target.value })
              }
              className="w-full border border-gray-300 rounded-md p-2"
              placeholder="e.g., General Knowledge"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              League <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={metadata.league}
              onChange={(e) =>
                setMetadata({ ...metadata, league: e.target.value })
              }
              className="w-full border border-gray-300 rounded-md p-2"
              placeholder="e.g., Premier League"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Description (Optional)
            </label>
            <input
              type="text"
              value={metadata.description}
              onChange={(e) =>
                setMetadata({ ...metadata, description: e.target.value })
              }
              className="w-full border border-gray-300 rounded-md p-2"
              placeholder="Brief description"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isUploading}
          className="w-full bg-primary-600 text-white py-2 rounded-md hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isUploading ? 'Uploading...' : 'Upload Quiz'}
        </button>
      </form>
    </div>
  );
}
