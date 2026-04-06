import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search, ChevronRight } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { StudentDetailView } from './StudentDetailView';
import type { CounselorOutletContext, CounselorStudent } from './CounselorDashboard';

export function StudentList() {
  const { students } = useOutletContext<CounselorOutletContext>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<CounselorStudent | null>(null);

  const filteredStudents = students.filter((student) =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const daysSince = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince === 0) return 'Today';
    if (daysSince === 1) return 'Yesterday';
    return `${daysSince} days ago`;
  };

  const listPanel = (
    <div className="p-4 space-y-4">
      <div className="pt-2 hidden lg:block">
        <h2 className="mb-1">Student List</h2>
        <p className="text-sm text-gray-600">View and manage student check-ins</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          type="text"
          placeholder="Search students..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 text-sm"
        />
      </div>

      <div className="space-y-2">
        {filteredStudents.map((student) => (
          <Card
            key={student.id}
            className={`p-4 cursor-pointer transition-all ${
              selectedStudent?.id === student.id
                ? 'border-blue-300 bg-blue-50 shadow-sm'
                : 'hover:shadow-md hover:border-gray-300'
            }`}
            onClick={() => setSelectedStudent(student)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-sm font-medium truncate">{student.name}</span>
                  {student.alertLevel === 'high' && (
                    <Badge className="bg-red-100 text-red-800 text-xs flex-shrink-0">High</Badge>
                  )}
                  {student.alertLevel === 'medium' && (
                    <Badge className="bg-amber-100 text-amber-800 text-xs flex-shrink-0">Med</Badge>
                  )}
                </div>
                <div className="text-xs text-gray-500 flex items-center space-x-2">
                  <span>{student.checkIns.length} check-in{student.checkIns.length !== 1 ? 's' : ''}</span>
                  <span>•</span>
                  <span>{student.lastCheckIn ? formatDate(student.lastCheckIn) : 'No check-ins'}</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </div>
          </Card>
        ))}
      </div>

      {filteredStudents.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-gray-500 text-sm">No students found</p>
        </Card>
      )}
    </div>
  );

  // Mobile: drill-in navigation
  if (selectedStudent) {
    return (
      <div className="lg:hidden">
        <StudentDetailView
          student={selectedStudent}
          onBack={() => setSelectedStudent(null)}
        />
      </div>
    );
  }

  return (
    <>
      {/* Mobile layout */}
      <div className="lg:hidden p-4 space-y-4">
        <div className="pt-4">
          <h2 className="mb-2">Student List</h2>
          <p className="text-gray-600">View and manage student check-ins</p>
        </div>
        {listPanel}
      </div>

      {/* Desktop layout: master-detail panel */}
      <div className="hidden lg:flex h-full min-h-screen">
        <div className="w-80 border-r border-gray-200 bg-white overflow-y-auto flex-shrink-0">
          {listPanel}
        </div>
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {selectedStudent ? (
            <StudentDetailView
              student={selectedStudent}
              onBack={() => setSelectedStudent(null)}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <ChevronRight className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select a student to view their details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
