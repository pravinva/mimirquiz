'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';

export default function QuizLibrary() {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState({ league: '', topic: '', search: '' });

  const fetchQuizzes = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.league) params.append('league', filter.league);
      if (filter.topic) params.append('topic', filter.topic);
      if (filter.search) params.append('search', filter.search);

      const response = await fetch(`/api/quizzes?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setQuizzes(data.quizzes);
      }
    } catch (error) {
      console.error('Failed to fetch quizzes:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <input
          type="text"
          placeholder="Search quizzes..."
          value={filter.search}
          onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          className="border border-gray-300 rounded-md p-2"
        />
        <input
          type="text"
          placeholder="Filter by league..."
          value={filter.league}
          onChange={(e) => setFilter({ ...filter, league: e.target.value })}
          className="border border-gray-300 rounded-md p-2"
        />
        <input
          type="text"
          placeholder="Filter by topic..."
          value={filter.topic}
          onChange={(e) => setFilter({ ...filter, topic: e.target.value })}
          className="border border-gray-300 rounded-md p-2"
        />
      </div>

      {isLoading ? (
        <p className="text-center py-8 text-gray-500">Loading quizzes...</p>
      ) : quizzes.length === 0 ? (
        <p className="text-center py-8 text-gray-500">No quizzes found</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  File Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Author
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Topic
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  League
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Questions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Rounds
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Times Played
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Uploaded
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {quizzes.map((quiz) => (
                <tr key={quiz.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {quiz.fileName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {quiz.author}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {quiz.topic}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {quiz.league}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {quiz.totalQuestions}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {quiz.totalRounds}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {quiz.timesPlayed}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(quiz.createdAt), 'MMM d, yyyy')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
