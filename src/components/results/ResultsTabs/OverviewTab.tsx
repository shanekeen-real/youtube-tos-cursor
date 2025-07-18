import React from 'react';
import { BarChart3, AlertTriangle, Target, Check, Shield, Zap, FileText, CheckCircle, Info } from 'lucide-react';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import { ScanData } from '../types';
import { getRiskBadgeVariant, generateAnalysisSummary, toArray } from '../ResultsUtils';

interface OverviewTabProps {
  data: ScanData;
}

export default function OverviewTab({ data }: OverviewTabProps) {
  const analysisSummary = generateAnalysisSummary(data);
  
  // Get the correct icon component based on the summary
  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'CheckCircle': return CheckCircle;
      case 'AlertTriangle': return AlertTriangle;
      case 'Info': return Info;
      default: return Info;
    }
  };
  
  const IconComponent = getIconComponent(analysisSummary.icon);

  return (
    <div className="h-full">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <h3 className="text-title font-bold text-gray-900">Analysis Overview</h3>
            <p className="text-body text-gray-600">Comprehensive risk assessment summary</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Risk Assessment */}
        <div className="flex flex-col gap-6">
          {/* Risk Score Card */}
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-50 rounded-full -translate-y-16 translate-x-16 opacity-50"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className="text-body font-semibold text-gray-800 mb-1">Risk Score</h4>
                  <p className="text-caption text-gray-600">Overall content risk assessment</p>
                </div>
                <Badge variant={getRiskBadgeVariant(data.riskLevel)} className="text-sm">
                  {data.riskLevel} Risk
                </Badge>
              </div>
              
              <div className="flex items-center gap-6 mb-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-100 to-yellow-200 flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-800">{data.riskScore}</span>
                  </div>
                  <div className="absolute inset-0 rounded-full border-4 border-yellow-200"></div>
                  <div 
                    className="absolute inset-0 rounded-full border-4 border-yellow-500"
                    style={{
                      clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%)`,
                      transform: `rotate(${(data.riskScore / 100) * 360}deg)`
                    }}
                  ></div>
                </div>
                <div className="flex-1">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-caption text-gray-600">Low Risk</span>
                      <span className="text-caption text-gray-600">High Risk</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${data.riskScore}%` }}
                      ></div>
                    </div>
                    <div className="text-caption text-gray-500 text-center">
                      Score: {data.riskScore}/100
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Analysis Summary Card */}
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-8 h-8 ${analysisSummary.bgColor} rounded-lg flex items-center justify-center`}>
                <IconComponent className={`w-4 h-4 ${analysisSummary.iconColor}`} />
              </div>
              <h4 className="text-body font-semibold text-gray-800">Analysis Summary</h4>
            </div>
            
            <div className="space-y-3">
              <h5 className="text-body font-medium text-gray-800">{analysisSummary.title}</h5>
              <p className="text-caption text-gray-600 leading-relaxed">{analysisSummary.summary}</p>
            </div>
          </Card>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="text-center p-4">
              <div className="w-12 h-12 bg-risk/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-6 h-6 text-risk" />
              </div>
              <div className="text-2xl font-bold text-gray-800 mb-1">{toArray(data.flaggedSections).length}</div>
              <div className="text-caption text-gray-600">Flagged Sections</div>
            </Card>
            
            <Card className="text-center p-4">
              <div className="w-12 h-12 bg-safe/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Target className="w-6 h-6 text-safe" />
              </div>
              <div className="text-2xl font-bold text-gray-800 mb-1">{toArray(data.suggestions).length}</div>
              <div className="text-caption text-gray-600">Suggestions</div>
            </Card>
          </div>

          {/* Content Info Card */}
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-gray-600" />
              </div>
              <h4 className="text-body font-semibold text-gray-800">Content Details</h4>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <div className="text-caption text-gray-600 mb-1">Title</div>
                  <div className="text-body font-medium text-gray-800 truncate">{data.title}</div>
                </div>
              </div>
              
              {data.url && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-caption text-gray-600 mb-1">URL</div>
                    <div className="text-caption text-gray-800 truncate">{data.url}</div>
                  </div>
                </div>
              )}
              
              {data.createdAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="flex-1">
                    <div className="text-caption text-gray-600 mb-1">Analysis Date</div>
                    <div className="text-body font-medium text-gray-800">
                      {new Date(data.createdAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
        
        {/* Right Column - Analysis Summary */}
        <div className="flex flex-col gap-6">
          {/* Analysis Summary Card */}
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-yellow-600" />
              </div>
              <h4 className="text-body font-semibold text-gray-800">Analysis Summary</h4>
            </div>
            
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <div>
                    <div className="text-body font-medium text-gray-800 mb-1">Content Analyzed</div>
                    <div className="text-caption text-gray-600">
                      This content has been thoroughly analyzed for potential Terms of Service violations, 
                      copyright issues, and demonetization risks using advanced AI technology.
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Target className="w-3 h-3 text-white" />
                  </div>
                  <div>
                    <div className="text-body font-medium text-gray-800 mb-1">AI-Powered Detection</div>
                    <div className="text-caption text-gray-600">
                      Advanced machine learning models identified potential risks and provided 
                      actionable suggestions to protect your content and revenue.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Action Card */}
          <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-body font-semibold text-gray-800">Next Steps</h4>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-caption text-gray-700">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span>Review detailed analysis in the Details tab</span>
              </div>
              <div className="flex items-center gap-3 text-caption text-gray-700">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span>Implement suggested improvements</span>
              </div>
              <div className="flex items-center gap-3 text-caption text-gray-700">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span>Monitor content performance</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
} 