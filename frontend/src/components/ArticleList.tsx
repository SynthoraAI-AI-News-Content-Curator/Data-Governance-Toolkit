'use client';

import { useState } from 'react';
import useSWR from 'swr';
import ArticleCard from './ArticleCard';
import Pagination from './Pagination';
import FilterBar from './FilterBar';
import { Article } from '@/types';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function ArticleList() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    source: '',
    topic: '',
    sort: 'publishedAt',
    order: 'desc'
  });

  const query = new URLSearchParams({
    page: String(page),
    limit: '12',
    ...filters
  }).toString();

  const { data, error, isLoading } = useSWR(
    `${process.env.NEXT_PUBLIC_API_URL}/api/articles?${query}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false
    }
  );

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load articles. Please try again.</p>
      </div>
    );
  }

  if (isLoading) {
    return <ArticleListSkeleton />;
  }

  const { data: articles, pagination } = data;

  return (
    <div className="space-y-8">
      <FilterBar filters={filters} onFilterChange={setFilters} />

      {articles.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No articles found. Try adjusting your filters.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article: Article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>

          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}

function ArticleListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(12)].map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="bg-gray-200 h-48 rounded-lg mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  );
}
