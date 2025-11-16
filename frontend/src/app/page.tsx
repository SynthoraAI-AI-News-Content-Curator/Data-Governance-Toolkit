import { Suspense } from 'react';
import ArticleList from '@/components/ArticleList';
import HeroSection from '@/components/HeroSection';
import StatsSection from '@/components/StatsSection';

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <HeroSection />
      <StatsSection />

      <section className="container mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold mb-8">Latest Articles</h2>
        <Suspense fallback={<ArticleListSkeleton />}>
          <ArticleList />
        </Suspense>
      </section>
    </main>
  );
}

function ArticleListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="bg-gray-200 h-48 rounded-lg mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  );
}
