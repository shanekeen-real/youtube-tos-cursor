import React, { useContext } from 'react';
import { TrendingUp, DollarSign, Shield, Clock, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Target } from 'lucide-react';
import { Button } from '@/lib/imports';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AuthContext } from './ClientLayout';

const benefits: Array<{
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  type: string;
}> = [];

export default function BenefitsSection() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const authContext = useContext(AuthContext);

  const handleStartProtecting = () => {
    if (status === 'authenticated' && session?.user) {
      // User is logged in, redirect to dashboard
      router.push('/dashboard');
    } else {
      // User is not logged in, open auth modal
      authContext?.setAuthOpen(true);
    }
  };

  return (
    <section className="w-full py-16 mt-24">
      <div className="w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <div>
            <div className="text-sm font-medium text-yellow-600 mb-2">YouTube Demonetization Protection</div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Prevent YouTube Demonetization Protect Your Revenue
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Don't let YouTube demonetization destroy months of hard work. Yellow Dollar's AI-powered platform 
              helps creators prevent demonetization and maintain sustainable income streams through advanced content analysis.
            </p>
            


            <Button variant="primary" size="lg" onClick={handleStartProtecting}>
              Start Protecting Your Revenue
            </Button>
          </div>

          {/* Visual Dashboard */}
          <div className="relative">
                         <div className="bg-white rounded-2xl p-6 border border-gray-200">
                             <div className="flex items-center justify-between mb-6">
                 <h3 className="text-lg font-semibold text-gray-900">Revenue Safety Dashboard</h3>
               </div>
              
              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-green-600">$12,450</div>
                      <div className="text-xs text-gray-600">Protected Revenue</div>
                    </div>
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-red-600">$2,150</div>
                      <div className="text-xs text-gray-600">Revenue at Risk</div>
                    </div>
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </div>

              {/* Recent Scans */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-gray-500">Recent Scans</h4>
                {[
                  { 
                    title: 'Vlog: Daily Life', 
                    status: 'warning', 
                    time: '2 min ago',
                    policyRisk: 'Hate Speech',
                    suggestionsCount: 4,
                    riskScore: 63,
                    riskLevel: 'MEDIUM'
                  },
                  { title: 'Gaming Tutorial #47', status: 'safe', time: '1 hour ago' },
                  { title: 'Product Review: Tech', status: 'safe', time: '3 hours ago' }
                ].map((check, index) => (
                  <div key={index} className="relative">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {check.status === 'safe' ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                        )}
                        <span className="text-sm font-medium text-gray-900">{check.title}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">{check.time}</span>
                        {check.policyRisk && (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                    
                    {/* Expanded Content - Always Visible */}
                    {check.policyRisk && (
                      <div className="mt-0 p-4 bg-gray-50 border-t-0 rounded-b-lg">
                        <div className="border-t border-gray-200 pt-4">
                          <div className="space-y-4">
                                                         {/* Policy Risk and Risk Score Row */}
                             <div className="space-y-3">
                               <div className="flex items-center justify-between">
                                 <span className="text-sm font-medium text-gray-900">Policy Risks Identified</span>
                                 <div className="flex items-center space-x-2">
                                   <span className="text-sm font-medium text-yellow-700">Score: {check.riskScore}/100</span>
                                   <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full border border-yellow-200">
                                     {check.riskLevel} Risk
                                   </span>
                                 </div>
                               </div>
                             </div>
                            
                            {/* Suggestions Group */}
                            <div className="space-y-3">
                              <p className="text-sm text-gray-700">
                                Please follow the suggestions and re-scan to secure your revenue on this video.
                              </p>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex space-x-3 pt-2">
                              <button className="px-3 py-1.5 border border-yellow-600 text-yellow-700 text-xs font-medium rounded-md hover:bg-yellow-50 transition-colors flex items-center space-x-2">
                                <span>View Suggestions</span>
                                <div className="w-5 h-5 bg-yellow-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                  {check.suggestionsCount}
                                </div>
                              </button>
                              <button className="px-3 py-1.5 border border-gray-600 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-50 transition-colors">
                                View Scan Details
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 