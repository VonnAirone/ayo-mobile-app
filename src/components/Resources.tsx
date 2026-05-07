import { Phone, MessageCircle, BookOpen, Heart, ExternalLink, ShieldCheck } from 'lucide-react';
import { Card } from './ui/card';

interface SupportResource {
  id: string;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  actionLabel: string;
  url: string;
}

interface Article {
  id: string;
  title: string;
  description: string;
  url: string;
}

const SUPPORT_RESOURCES: SupportResource[] = [
  {
    id: 'hopeline',
    icon: <Phone className="w-5 h-5" />,
    iconBg: 'bg-teal-50 text-teal-600',
    title: 'Hopeline Philippines',
    description: 'Free 24/7 crisis hotline for emotional support and suicide prevention.',
    actionLabel: 'Call 02-8804-4673',
    url: 'tel:028804673',
  },
  {
    id: 'ncmh',
    icon: <ShieldCheck className="w-5 h-5" />,
    iconBg: 'bg-rose-50 text-rose-500',
    title: 'NCMH Crisis Hotline',
    description: 'National Center for Mental Health — crisis line available any time of day.',
    actionLabel: 'Call 1553',
    url: 'tel:1553',
  },
  {
    id: 'intouch',
    icon: <MessageCircle className="w-5 h-5" />,
    iconBg: 'bg-amber-50 text-amber-600',
    title: 'In Touch Community Services',
    description: 'Counseling and crisis intervention by trained professionals.',
    actionLabel: 'Call 02-8893-7603',
    url: 'tel:028893603',
  },
  {
    id: 'who',
    icon: <Heart className="w-5 h-5" />,
    iconBg: 'bg-purple-50 text-purple-500',
    title: 'WHO Mental Health Support',
    description: 'Global mental health resources, guides, and self-help tools.',
    actionLabel: 'Visit Website',
    url: 'https://www.who.int/health-topics/mental-health',
  },
];

const ARTICLES: Article[] = [
  {
    id: 'anxiety',
    title: 'Understanding Anxiety',
    description: 'Learn the signs of anxiety and practical ways to manage it day-to-day.',
    url: 'https://www.nimh.nih.gov/health/topics/anxiety-disorders',
  },
  {
    id: 'resilience',
    title: 'Building Resilience',
    description: 'Evidence-based strategies to bounce back from stress and adversity.',
    url: 'https://www.apa.org/topics/resilience',
  },
  {
    id: 'sleep',
    title: 'Sleep & Mental Health',
    description: 'How sleep quality directly affects mood, focus, and emotional regulation.',
    url: 'https://www.sleepfoundation.org/mental-health',
  },
  {
    id: 'mindfulness',
    title: 'Mindfulness for Students',
    description: 'Simple breathing and mindfulness exercises you can do between classes.',
    url: 'https://www.headspace.com/mindfulness',
  },
];

export function Resources() {
  return (
    <div className="p-6 lg:p-8 max-w-3xl space-y-7">
      <div className="pt-2">
        <h2 className="text-2xl font-semibold text-slate-800">Resources</h2>
        <p className="text-slate-400 text-sm mt-0.5">Support and information for your well-being</p>
      </div>

      {/* Crisis & support lines */}
      <section>
        <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">
          Support Lines
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SUPPORT_RESOURCES.map((r) => (
            <Card key={r.id} className="p-4 border border-stone-100 rounded-2xl shadow-sm">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${r.iconBg}`}>
                  {r.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 mb-0.5">{r.title}</p>
                  <p className="text-xs text-slate-500 leading-relaxed mb-3">{r.description}</p>
                  <a
                    href={r.url}
                    target={r.url.startsWith('http') ? '_blank' : undefined}
                    rel={r.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-600 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {r.actionLabel}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Articles */}
      <section>
        <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">
          Helpful Articles
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ARTICLES.map((article) => (
            <a
              key={article.id}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Card className="p-4 border border-stone-100 rounded-2xl shadow-sm hover:border-teal-200 hover:shadow-md transition-all duration-150 cursor-pointer group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <BookOpen className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />
                      <p className="text-sm font-semibold text-slate-800 group-hover:text-teal-700 transition-colors">
                        {article.title}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{article.description}</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-teal-400 flex-shrink-0 mt-0.5 transition-colors" />
                </div>
              </Card>
            </a>
          ))}
        </div>
      </section>

      {/* Reminder banner */}
      <Card className="p-4 bg-teal-50 border border-teal-100 rounded-2xl flex items-start gap-3">
        <div className="w-8 h-8 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
          <Heart className="w-4 h-4 text-teal-600" fill="currentColor" />
        </div>
        <div>
          <p className="text-sm font-semibold text-teal-800 mb-0.5">You are not alone</p>
          <p className="text-xs text-teal-700 leading-relaxed">
            Reaching out for help is a sign of strength. Your mental health matters, and there are
            people who care and want to support you.
          </p>
        </div>
      </Card>
    </div>
  );
}
