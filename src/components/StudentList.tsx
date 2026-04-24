import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search, Users } from 'lucide-react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { StudentDetailView } from './StudentDetailView';
import type { CounselorOutletContext, CounselorStudent } from './CounselorDashboard';

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

function formatLastSeen(dateString: string): string {
  if (!dateString) return 'No check-ins';
  const d = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24));
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  return `${d}d ago`;
}

const ALERT_ORDER: Record<string, number> = { high: 0, medium: 1, none: 2 };

export function StudentList() {
  const { students } = useOutletContext<CounselorOutletContext>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<CounselorStudent | null>(null);

  const filteredStudents = students
    .filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => ALERT_ORDER[a.alertLevel] - ALERT_ORDER[b.alertLevel]);

  const listPanel = (
    <div className="flex flex-col h-full">
      {/* List header */}
      <div className="px-4 pt-5 pb-3 border-b border-stone-100 flex-shrink-0">
        <h2 className="text-sm font-semibold text-slate-700 hidden lg:block mb-3">Students</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search by name…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-sm bg-stone-50 border-stone-200 focus:border-teal-300 rounded-xl h-9"
          />
        </div>
        {filteredStudents.length > 0 && (
          <p className="text-xs text-slate-400 mt-2">
            {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Student list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
        {filteredStudents.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-slate-400 text-sm">No students found</p>
          </div>
        ) : (
          filteredStudents.map((student) => {
            const isSelected = selectedStudent?.id === student.id;
            const isHigh = student.alertLevel === 'high';
            const isMedium = student.alertLevel === 'medium';

            return (
              <button
                key={student.id}
                onClick={() => setSelectedStudent(student)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all duration-150 ${
                  isSelected
                    ? 'border-teal-200 bg-teal-50 shadow-sm'
                    : 'border-transparent hover:bg-stone-50 hover:border-stone-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar with alert indicator */}
                  <div className="relative flex-shrink-0">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold ${
                        isSelected
                          ? 'bg-teal-100 text-teal-700'
                          : isHigh
                          ? 'bg-rose-100 text-rose-600'
                          : isMedium
                          ? 'bg-amber-100 text-amber-600'
                          : 'bg-stone-100 text-slate-500'
                      }`}
                    >
                      {getInitials(student.name)}
                    </div>
                    {student.alertLevel !== 'none' && (
                      <span
                        className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                          isHigh ? 'bg-rose-400' : 'bg-amber-400'
                        }`}
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isSelected ? 'text-teal-800' : 'text-slate-700'}`}>
                      {student.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400">
                        {formatLastSeen(student.lastCheckIn)}
                      </span>
                      <span className="text-stone-300 text-xs">·</span>
                      <span className="text-xs text-slate-400">
                        {student.checkIns.length} check-in{student.checkIns.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  // Mobile: drill-in navigation
  if (selectedStudent) {
    return (
      <div className="lg:hidden">
        <StudentDetailView student={selectedStudent} onBack={() => setSelectedStudent(null)} />
      </div>
    );
  }

  return (
    <>
      {/* Mobile layout */}
      <div className="lg:hidden">
        <div className="px-4 pt-5 pb-3">
          <h2 className="text-2xl font-semibold text-slate-800">Students</h2>
          <p className="text-slate-400 text-sm mt-0.5">View and manage student check-ins</p>
        </div>
        {listPanel}
      </div>

      {/* Desktop layout: master-detail */}
      <div className="hidden lg:flex h-full min-h-screen">
        {/* Left panel: student list */}
        <div className="w-72 border-r border-stone-100 bg-white flex-shrink-0 flex flex-col">
          {listPanel}
        </div>

        {/* Right panel: detail view */}
        <div className="flex-1 overflow-y-auto bg-stone-50">
          {selectedStudent ? (
            <StudentDetailView
              student={selectedStudent}
              onBack={() => setSelectedStudent(null)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-600 text-sm font-medium">Select a student</p>
              <p className="text-slate-400 text-xs mt-1">
                Choose a student from the list to view their check-in history
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
