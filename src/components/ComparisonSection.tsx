import React from 'react';
import { Check, X } from 'lucide-react';

const features = [
  { name: 'Real-time Policy Analysis', yellowDollar: true, competitor1: false, competitor2: true, competitor3: false },
  { name: 'AI-Powered Risk Assessment', yellowDollar: true, competitor1: true, competitor2: false, competitor3: true },
  { name: 'Instant Fix Recommendations', yellowDollar: true, competitor1: false, competitor2: false, competitor3: false },
  { name: 'Content Pre-screening', yellowDollar: true, competitor1: true, competitor2: true, competitor3: false },
  { name: 'Policy Change Notifications', yellowDollar: true, competitor1: false, competitor2: true, competitor3: true },
  { name: 'Revenue Protection Analytics', yellowDollar: true, competitor1: false, competitor2: false, competitor3: false },
  { name: 'Multiple Content Formats', yellowDollar: true, competitor1: true, competitor2: false, competitor3: true },
  { name: 'API Integration', yellowDollar: true, competitor1: false, competitor2: true, competitor3: false },
  { name: '24/7 Support', yellowDollar: true, competitor1: false, competitor2: false, competitor3: true },
];

export default function ComparisonSection() {
  return (
    <section className="w-full py-16 mt-24">
      <div className="w-full">
        <div className="text-center mb-16">
          <div className="relative inline-block">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Why choose yellowdollar?
            </h2>
            <img 
              src="/XL_64x64 yellow spark_left.svg" 
              alt="Spark icon" 
              className="absolute top-1 -right-4 sm:-right-4 md:-right-6 lg:-right-8 w-5 h-5 transform -translate-x-13 sm:translate-x-0"
            />
          </div>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Compare our comprehensive solution with other platforms in the market. 
            See why creators trust Yellow Dollar to protect their revenue.
          </p>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[600px] md:min-w-[800px]">
                         <div className="bg-white rounded-xl border border-gray-200 overflow-hidden text-xs md:text-sm">
                             {/* Header */}
               <div className="grid grid-cols-5 bg-gray-50 border-b border-gray-200">
                 <div className="p-2 md:p-4"></div>
                <div className="p-2 md:p-4 text-center">
                  <div className="font-bold text-yellow-600">Yellow Dollar</div>
                  <div className="text-xs text-gray-500 mt-1">Our Solution</div>
                </div>
                <div className="p-2 md:p-4 text-center">
                  <div className="font-semibold text-gray-900">TubeBuddy</div>
                  <div className="text-xs text-gray-500 mt-1">Competitor</div>
                </div>
                <div className="p-2 md:p-4 text-center">
                  <div className="font-semibold text-gray-900">VidIQ</div>
                  <div className="text-xs text-gray-500 mt-1">Competitor</div>
                </div>
                <div className="p-2 md:p-4 text-center">
                  <div className="font-semibold text-gray-900">Creator Studio</div>
                  <div className="text-xs text-gray-500 mt-1">YouTube Native</div>
                </div>
              </div>

              {/* Feature Rows */}
              {features.map((feature, index) => (
                <div 
                  key={index} 
                  className={`grid grid-cols-5 border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                >
                  <div className="p-2 md:p-4 font-medium text-gray-900">{feature.name}</div>
                  <div className="p-2 md:p-4 text-center">
                    <div className={`inline-flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full ${
                      feature.yellowDollar ? 'bg-yellow-600 text-white' : 'bg-gray-200'
                    }`}>
                      {feature.yellowDollar ? (
                        <Check className="h-3 w-3 md:h-4 md:w-4" />
                      ) : (
                        <X className="h-3 w-3 md:h-4 md:w-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                  <div className="p-2 md:p-4 text-center">
                    <div className={`inline-flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full ${
                      feature.competitor1 ? 'bg-gray-600 text-white' : 'bg-gray-200'
                    }`}>
                      {feature.competitor1 ? (
                        <Check className="h-3 w-3 md:h-4 md:w-4" />
                      ) : (
                        <X className="h-3 w-3 md:h-4 md:w-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                  <div className="p-2 md:p-4 text-center">
                    <div className={`inline-flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full ${
                      feature.competitor2 ? 'bg-gray-600 text-white' : 'bg-gray-200'
                    }`}>
                      {feature.competitor2 ? (
                        <Check className="h-3 w-3 md:h-4 md:w-4" />
                      ) : (
                        <X className="h-3 w-3 md:h-4 md:w-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                  <div className="p-2 md:p-4 text-center">
                    <div className={`inline-flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full ${
                      feature.competitor3 ? 'bg-gray-600 text-white' : 'bg-gray-200'
                    }`}>
                      {feature.competitor3 ? (
                        <Check className="h-3 w-3 md:h-4 md:w-4" />
                      ) : (
                        <X className="h-3 w-3 md:h-4 md:w-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 