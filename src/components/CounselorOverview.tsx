import { useOutletContext } from 'react-router-dom';
import { AlertTriangle, TrendingUp, Users, Calendar } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import type { CounselorOutletContext } from './CounselorDashboard';

export function CounselorOverview() {
  const { students } = useOutletContext<CounselorOutletContext>();
  const totalStudents = students.length;
  const highAlerts = students.filter((s) => s.alertLevel === 'high').length;
  const mediumAlerts = students.filter((s) => s.alertLevel === 'medium').length;
  const activeToday = students.filter((s) => {
    const daysSince = Math.floor(
      (Date.now() - new Date(s.lastCheckIn).getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSince === 0;
  }).length;

  const studentsWithCheckIns = students.filter((s) => s.checkIns.length > 0);

  const studentsNeedingAttention = students.filter(
    (s) => s.alertLevel === 'high' || s.alertLevel === 'medium'
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const daysSince = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince === 0) return 'Today';
    if (daysSince === 1) return 'Yesterday';
    return `${daysSince} days ago`;
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl space-y-6">
      <div className="pt-2">
        <h2 className="text-2xl mb-1">Dashboard Overview</h2>
        <p className="text-gray-600">Monitor student well-being at a glance</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl text-blue-600">{totalStudents}</div>
              <div className="text-sm text-gray-600">Total Students</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="text-2xl text-red-600">{highAlerts}</div>
              <div className="text-sm text-gray-600">High Alerts</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl text-amber-600">{mediumAlerts}</div>
              <div className="text-sm text-gray-600">Medium Alerts</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Calendar className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl text-green-600">{activeToday}</div>
              <div className="text-sm text-gray-600">Active Today</div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3>Students Who Have Checked In</h3>
          <TrendingUp className="w-5 h-5 text-blue-600" />
        </div>
        <div className="text-4xl font-semibold text-blue-600 mb-3">
          {studentsWithCheckIns.length}
          <span className="text-lg text-gray-400"> / {totalStudents}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: totalStudents > 0 ? `${(studentsWithCheckIns.length / totalStudents) * 100}%` : '0%' }}
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h3 className="mb-3">Students Needing Attention</h3>
          {studentsNeedingAttention.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-gray-500">No students requiring immediate attention</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {studentsNeedingAttention.map((student) => (
                <Card key={student.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-medium">{student.name}</span>
                        <Badge
                          className={
                            student.alertLevel === 'high'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }
                        >
                          {student.alertLevel === 'high' ? 'High Priority' : 'Medium Priority'}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>Last check-in: {formatDate(student.lastCheckIn)}</div>
                        <div>Avg mood: {student.averageMood.toFixed(1)}/10</div>
                        {student.recentConcerns.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {student.recentConcerns.map((concern, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {concern}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-3">Action Items</h3>
          <Card className="p-4 bg-blue-50 border-blue-200">
            <ul className="space-y-3 text-sm text-blue-800">
              {highAlerts > 0 && (
                <li className="flex items-start space-x-2">
                  <span className="mt-0.5 text-blue-400 flex-shrink-0">•</span>
                  <span>Follow up with {highAlerts} student{highAlerts > 1 ? 's' : ''} flagged as high priority</span>
                </li>
              )}
              {mediumAlerts > 0 && (
                <li className="flex items-start space-x-2">
                  <span className="mt-0.5 text-blue-400 flex-shrink-0">•</span>
                  <span>Monitor {mediumAlerts} student{mediumAlerts > 1 ? 's' : ''} with medium priority alerts</span>
                </li>
              )}
              <li className="flex items-start space-x-2">
                <span className="mt-0.5 text-blue-400 flex-shrink-0">•</span>
                <span>Review trends in student check-in patterns</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
