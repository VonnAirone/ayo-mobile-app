import { Phone, MessageCircle, BookOpen, Heart, ExternalLink } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';

export function Resources() {
  const resources = [
    {
      icon: Phone,
      title: 'Crisis Hotline',
      description: '24/7 support for immediate help',
      action: '988 - Suicide & Crisis Lifeline',
      color: 'bg-red-100 text-red-600',
    },
    {
      icon: MessageCircle,
      title: 'School Counselor',
      description: 'Schedule a session with your counselor',
      action: 'Request Appointment',
      color: 'bg-blue-100 text-blue-600',
    },
    {
      icon: Heart,
      title: 'Peer Support',
      description: 'Connect with peer support groups',
      action: 'Join Group',
      color: 'bg-purple-100 text-purple-600',
    },
    {
      icon: BookOpen,
      title: 'Mental Health Library',
      description: 'Articles and guides on mental wellness',
      action: 'Browse Resources',
      color: 'bg-green-100 text-green-600',
    },
  ];

  const articles = [
    {
      title: 'Managing Academic Stress',
      description: 'Tips for balancing schoolwork and well-being',
    },
    {
      title: 'Building Healthy Habits',
      description: 'Sleep, exercise, and nutrition for mental health',
    },
    {
      title: 'When to Seek Help',
      description: 'Recognizing signs that you need support',
    },
    {
      title: 'Mindfulness for Students',
      description: 'Simple meditation and breathing exercises',
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-4xl space-y-6">
      <div className="pt-2">
        <h2 className="text-2xl mb-1">Resources</h2>
        <p className="text-gray-600">Support and information for your well-being</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {resources.map((resource, idx) => {
          const Icon = resource.icon;
          return (
            <Card key={idx} className="p-4">
              <div className="flex items-start space-x-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${resource.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="mb-1">{resource.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">{resource.description}</p>
                  <Button variant="outline" size="sm" className="text-blue-600 border-blue-200">
                    {resource.action}
                    <ExternalLink className="w-3 h-3 ml-2" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div>
        <h3 className="mb-3">Helpful Articles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {articles.map((article, idx) => (
            <Card key={idx} className="p-4 hover:shadow-md transition-shadow cursor-pointer">
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
