'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Heart, Star, Eye } from 'lucide-react';
import { Article } from '@/types';
import { cn } from '@/lib/utils';

interface ArticleCardProps {
  article: Article;
}

export default function ArticleCard({ article }: ArticleCardProps) {
  const {
    id,
    title,
    summary,
    source,
    topics,
    publishedAt,
    views,
    ratingAverage,
    favoritesCount,
    sentiment
  } = article;

  const getSentimentColor = (tone: string) => {
    switch (tone) {
      case 'positive': return 'text-green-600 bg-green-50';
      case 'negative': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <Link
      href={`/articles/${id}`}
      className="block group hover:shadow-lg transition-shadow duration-200 bg-white rounded-lg overflow-hidden border border-gray-200"
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <span className="text-sm font-medium text-blue-600">{source}</span>
          <span className={cn(
            'px-2 py-1 rounded-full text-xs font-medium',
            getSentimentColor(sentiment?.tone || 'neutral')
          )}>
            {sentiment?.tone || 'neutral'}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {title}
        </h3>

        {/* Summary */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
          {summary}
        </p>

        {/* Topics */}
        <div className="flex flex-wrap gap-2 mb-4">
          {topics.slice(0, 2).map((topic) => (
            <span
              key={topic}
              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md"
            >
              {topic}
            </span>
          ))}
          {topics.length > 2 && (
            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md">
              +{topics.length - 2} more
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{formatDistanceToNow(new Date(publishedAt), { addSuffix: true })}</span>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Eye className="w-4 h-4" />
              <span>{views}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4 text-yellow-500" />
              <span>{ratingAverage?.toFixed(1) || '0.0'}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Heart className="w-4 h-4 text-red-500" />
              <span>{favoritesCount || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
