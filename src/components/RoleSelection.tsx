import { useNavigate } from 'react-router-dom';
import { Heart, Users } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

export function RoleSelection() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4 shadow-lg">
            <Heart className="w-10 h-10 text-blue-500" fill="currentColor" />
          </div>
          <h1 className="text-white text-5xl font-semibold mb-2">Ayo</h1>
          <p className="text-blue-100 text-lg">Your Mental Wellness Companion</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-8 bg-white/95 backdrop-blur hover:shadow-xl transition-shadow">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Heart className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl mb-2">Student</h2>
                <p className="text-gray-600 text-sm mb-6">
                  Complete well-being check-ins, track your mood over time, and access mental health resources.
                </p>
              </div>
              <Button
                onClick={() => navigate('/student')}
                className="w-full bg-blue-600 hover:bg-blue-700 py-5"
              >
                Continue as Student
              </Button>
            </div>
          </Card>

          <Card className="p-8 bg-white/95 backdrop-blur hover:shadow-xl transition-shadow">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl mb-2">Guidance Counselor</h2>
                <p className="text-gray-600 text-sm mb-6">
                  Monitor student well-being, review check-in data, and manage interventions across your roster.
                </p>
              </div>
              <Button
                onClick={() => navigate('/counselor')}
                className="w-full bg-blue-600 hover:bg-blue-700 py-5"
              >
                Continue as Counselor
              </Button>
            </div>
          </Card>
        </div>

        <p className="text-center text-blue-100 text-sm mt-8">
          Your well-being matters. We're here to help.
        </p>
      </div>
    </div>
  );
}
