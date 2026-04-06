import { useEffect, useState } from 'react';
import { Phone, MessageCircle, BookOpen, Heart, ExternalLink } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { supabase } from '../lib/supabase';

interface Resource {
  id: string;
  title: string;
  description: string;
  category: 'support' | 'article';
  action_label: string | null;
  url: string | null;
  icon_name: string | null;
  color_class: string | null;
  sort_order: number;
}

const iconMap: Record<string, LucideIcon> = {
  Phone,
  MessageCircle,
  Heart,
  BookOpen,
};

export function Resources() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .order('sort_order');

      if (error) {
        console.error('Failed to load resources:', error.message);
      } else {
        setResources(data ?? []);
      }
      setLoading(false);
    }
    load();
  }, []);

  const supportResources = resources.filter((r) => r.category === 'support');
  const articles = resources.filter((r) => r.category === 'article');

  return (
    <div className="p-6 lg:p-8 max-w-4xl space-y-6">
      <div className="pt-2">
        <h2 className="text-2xl mb-1">Resources</h2>
        <p className="text-gray-600">Support and information for your well-being</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-8 bg-gray-200 rounded w-1/3 mt-2" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {supportResources.map((resource) => {
              const Icon = resource.icon_name ? (iconMap[resource.icon_name] ?? Heart) : Heart;
              return (
                <Card key={resource.id} className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${resource.color_class ?? 'bg-blue-100 text-blue-600'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="mb-1">{resource.title}</h3>
                      <p className="text-sm text-gray-600 mb-3">{resource.description}</p>
                      {resource.action_label && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-blue-600 border-blue-200"
                          onClick={() => resource.url && window.open(resource.url, '_blank')}
                        >
                          {resource.action_label}
                          <ExternalLink className="w-3 h-3 ml-2" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {articles.length > 0 && (
            <div>
              <h3 className="mb-3">Helpful Articles</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {articles.map((article) => (
                  <Card
                    key={article.id}
                    className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => article.url && window.open(article.url, '_blank')}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="mb-1">{article.title}</div>
                        <p className="text-sm text-gray-600">{article.description}</p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Card className="p-4 bg-blue-50 border-blue-200">
        <h3 className="text-blue-900 mb-2">Remember</h3>
        <p className="text-sm text-blue-800">
          You're not alone. Reaching out for help is a sign of strength, not weakness.
          Your mental health matters, and there are people who care and want to support you.
        </p>
      </Card>
    </div>
  );
}
