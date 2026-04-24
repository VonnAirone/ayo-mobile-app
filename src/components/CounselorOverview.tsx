import { useOutletContext } from 'react-router-dom';
import { AlertTriangle, TrendingUp, Users, Calendar, Clock, CheckCircle2, ChevronRight } from 'lucide-react';
import { Card } from './ui/card';
import type { CounselorOutletContext } from './CounselorDashboard';

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

function daysSinceDate(dateString: string): number {
  return Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24));
}

function formatLastSeen(dateString: string): string {
  if (!dateString) return 'Never';
  const d = daysSinceDate(dateString);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  return `${d}d ago`;
}

export function CounselorOverview() {
  const { students } = useOutletContext<CounselorOutletContext>();

  const totalStudents = students.length;
  const highPriority = students.filter((s) => s.alertLevel === 'high');
  const mediumPriority = students.filter((s) => s.alertLevel === 'medium');
  const studentsNeedingAttention = [...highPriority, ...mediumPriority];

  const checkedInToday = students.filter(
    (s) => s.lastCheckIn && daysSinceDate(s.lastCheckIn) === 0
  );
  const studentsWithCheckIns = students.filter((s) => s.checkIns.length > 0);
  const neverCheckedIn = students.filter((s) => s.checkIns.length === 0);
  const longInactive = students.filter(
    (s) => s.lastCheckIn && daysSinceDate(s.lastCheckIn) >= 7
  );

  const participationPct =
    totalStudents > 0
      ? Math.round((studentsWithCheckIns.length / totalStudents) * 100)
      : 0;

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const stats = [
    {
      label: 'Total Students',
      value: totalStudents,
      color: 'text-slate-800',
      bg: 'bg-teal-50',
      icon: Users,
      iconColor: 'text-teal-600',
    },
    {
      label: 'Active Today',
      value: checkedInToday.length,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      icon: CheckCircle2,
      iconColor: 'text-emerald-600',
    },
    {
      label: 'High Priority',
      value: highPriority.length,
      color: 'text-rose-500',
      bg: 'bg-rose-50',
      icon: AlertTriangle,
      iconColor: 'text-rose-500',
    },
    {
      label: 'Medium Priority',
      value: mediumPriority.length,
      color: 'text-amber-500',
      bg: 'bg-amber-50',
      icon: AlertTriangle,
      iconColor: 'text-amber-500',
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between pt-2">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800">Dashboard</h2>
          <p className="text-slate-400 text-sm mt-0.5">Student well-being overview</p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 bg-white border border-stone-100 px-3 py-1.5 rounded-full shadow-sm">
          <Calendar className="w-3.5 h-3.5" />
          <span>{today}</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(({ label, value, color, bg, icon: Icon, iconColor }) => (
          <Card key={label} className="p-5 border border-stone-100 rounded-2xl shadow-sm">
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div className={`text-3xl font-semibold ${color}`}>{value}</div>
            <div className="text-xs text-slate-400 mt-1 font-medium">{label}</div>
          </Card>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Needs attention — left 2/3 */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">
              Needs Attention
              {studentsNeedingAttention.length > 0 && (
                <span className="ml-2 text-xs font-normal text-slate-400">
                  {studentsNeedingAttention.length} student{studentsNeedingAttention.length !== 1 ? 's' : ''}
                </span>
              )}
            </h3>
          </div>

          {studentsNeedingAttention.length === 0 ? (
            <Card className="p-10 text-center border border-stone-100 rounded-2xl shadow-sm">
              <div className="text-3xl mb-2">🌿</div>
              <p className="text-slate-700 text-sm font-medium">All clear</p>
              <p className="text-slate-400 text-xs mt-1">No students need immediate attention right now</p>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {studentsNeedingAttention.map((student) => {
                const daysAgo = student.lastCheckIn ? daysSinceDate(student.lastCheckIn) : null;
                const isHigh = student.alertLevel === 'high';
                return (
                  <Card
                    key={student.id}
                    className={`p-4 border rounded-2xl shadow-sm ${
                      isHigh
                        ? 'border-rose-100 bg-rose-50/40'
                        : 'border-amber-100 bg-amber-50/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold ${
                          isHigh
                            ? 'bg-rose-100 text-rose-600'
                            : 'bg-amber-100 text-amber-600'
                        }`}
                      >
                        {getInitials(student.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-slate-800 text-sm">{student.name}</span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              isHigh
                                ? 'bg-rose-100 text-rose-600'
                                : 'bg-amber-100 text-amber-600'
                            }`}
                          >
                            {isHigh ? 'High' : 'Medium'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <Clock className="w-3 h-3" />
                            {daysAgo === null
                              ? 'No check-ins'
                              : daysAgo === 0
                              ? 'Checked in today'
                              : `${daysAgo}d since last check-in`}
                          </span>
                          {student.concernCount > 0 && (
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                              <AlertTriangle className="w-3 h-3" />
                              {student.concernCount} flag{student.concernCount !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        {student.recentConcerns.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {student.recentConcerns.slice(0, 3).map((concern, idx) => (
                              <span
                                key={idx}
                                className="text-xs bg-white border border-stone-200 text-slate-500 px-2 py-0.5 rounded-full"
                              >
                                {concern}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Participation */}
          <Card className="p-5 border border-stone-100 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700">Participation</h3>
              <TrendingUp className="w-4 h-4 text-teal-500" />
            </div>
            <div className="flex items-end gap-1.5 mb-3">
              <span className="text-3xl font-semibold text-slate-800">{studentsWithCheckIns.length}</span>
              <span className="text-slate-300 text-lg mb-0.5">/ {totalStudents}</span>
            </div>
            <div className="w-full bg-stone-100 rounded-full h-2 mb-2">
              <div
                className="bg-teal-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${participationPct}%` }}
              />
            </div>
            <p className="text-xs text-slate-400">{participationPct}% have ever checked in</p>
          </Card>

          {/* Inactive / never checked in */}
          {(longInactive.length > 0 || neverCheckedIn.length > 0) && (
            <Card className="p-5 border border-stone-100 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-700">Not Seen Recently</h3>
              </div>
              <div className="space-y-3">
                {neverCheckedIn.slice(0, 4).map((s) => (
                  <div key={s.id} className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center text-xs font-medium text-slate-400 flex-shrink-0">
                      {getInitials(s.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-600 truncate">{s.name}</p>
                      <p className="text-xs text-slate-400">Never checked in</p>
                    </div>
                  </div>
                ))}
                {longInactive.slice(0, 4).map((s) => (
                  <div key={s.id} className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center text-xs font-medium text-slate-400 flex-shrink-0">
                      {getInitials(s.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-600 truncate">{s.name}</p>
                      <p className="text-xs text-slate-400">{daysSinceDate(s.lastCheckIn)}d ago</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Today's focus */}
          <Card className="p-5 bg-teal-50 border border-teal-100 rounded-2xl shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Today's Focus</h3>
            <ul className="space-y-2.5">
              {highPriority.length > 0 && (
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-rose-400 rounded-full mt-1.5 flex-shrink-0" />
                  <span className="text-xs text-slate-600 leading-relaxed">
                    Reach out to {highPriority.length} high-priority student
                    {highPriority.length !== 1 ? 's' : ''}
                  </span>
                </li>
              )}
              {mediumPriority.length > 0 && (
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full mt-1.5 flex-shrink-0" />
                  <span className="text-xs text-slate-600 leading-relaxed">
                    Monitor {mediumPriority.length} medium-priority student
                    {mediumPriority.length !== 1 ? 's' : ''}
                  </span>
                </li>
              )}
              {neverCheckedIn.length > 0 && (
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-slate-300 rounded-full mt-1.5 flex-shrink-0" />
                  <span className="text-xs text-slate-600 leading-relaxed">
                    Encourage {neverCheckedIn.length} student
                    {neverCheckedIn.length !== 1 ? 's' : ''} to complete their first check-in
                  </span>
                </li>
              )}
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-teal-400 rounded-full mt-1.5 flex-shrink-0" />
                <span className="text-xs text-slate-600 leading-relaxed">
                  Review today's check-in responses
                </span>
              </li>
            </ul>
          </Card>
        </div>
      </div>

      {/* Today's activity strip */}
      {checkedInToday.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">
            Checked In Today{' '}
            <span className="font-normal text-slate-400">{checkedInToday.length} student{checkedInToday.length !== 1 ? 's' : ''}</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {checkedInToday.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-2 bg-white border border-stone-100 rounded-full px-3 py-1.5 shadow-sm"
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                    s.alertLevel === 'high'
                      ? 'bg-rose-100 text-rose-600'
                      : s.alertLevel === 'medium'
                      ? 'bg-amber-100 text-amber-600'
                      : 'bg-teal-100 text-teal-600'
                  }`}
                >
                  {getInitials(s.name)}
                </div>
                <span className="text-xs text-slate-600 font-medium">{s.name.split(' ')[0]}</span>
                {s.alertLevel !== 'none' && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      s.alertLevel === 'high' ? 'bg-rose-400' : 'bg-amber-400'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
