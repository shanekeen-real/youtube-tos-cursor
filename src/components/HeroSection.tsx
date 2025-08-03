import React, { useContext } from 'react';
import { Button } from '@/lib/imports';
import { AuthContext } from '@/lib/imports';
import { useRouter } from 'next/navigation';
import { Play, Shield, TrendingUp, Zap } from 'lucide-react';

const HeroSection = () => {
  const auth = useContext(AuthContext);
  const router = useRouter();

  const handleTryForFree = () => {
    if (!auth?.user) {
      auth?.setAuthOpen(true);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <section className="w-full bg-background pt-16 sm:pt-20 md:pt-24 lg:pt-32 pb-16 sm:pb-24 md:pb-32">
      <div className="w-full px-4 sm:px-6 md:px-12 lg:px-18 xl:px-24 2xl:px-[150px]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 md:gap-16 lg:gap-20 xl:gap-24 items-center min-w-0">
          {/* Text Content */}
                      <div className="text-center lg:text-left animate-fade-in-up min-w-0 overflow-hidden">
              <h1 className="text-3xl xs:text-3xl sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl 2xl:text-5xl font-bold leading-tight mb-4 sm:mb-6 break-words">
                Protect Your <span className="text-gradient text-transparent">YouTube Revenue</span>
              </h1>
              <p className="text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground mb-4 sm:mb-6 max-w-full lg:max-w-2xl mx-auto lg:mx-0 break-words">
                Analyze YouTube policies and video content instantly. Get AI-powered risk assessment and fix recommendations to keep your channel monetized.
              </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start mb-6 max-w-full min-w-0 overflow-hidden">
              <Button 
                variant="primary" 
                size="lg" 
                onClick={handleTryForFree}
              >
                <Zap className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Try for Free
              </Button>
              <div className="relative group w-full sm:w-auto">
                <Button 
                  variant="outlined" 
                  size="lg"
                >
                  <Play className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Watch Demo
                </Button>
                <div className="absolute left-1/2 -translate-x-1/2 mt-2 px-3 py-2 rounded-lg bg-gray-900 text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20 whitespace-nowrap">
                  Coming soon
                </div>
              </div>
            </div>

          </div>

          {/* Hero Visual */}
          <div className="relative animate-scale-in h-full flex flex-col justify-center min-w-0">
            <div className="relative bg-gradient-to-br from-[#F6C2321A] to-[#1717171A] rounded-lg sm:rounded-xl lg:rounded-2xl xl:rounded-3xl p-1 xs:p-2 sm:p-3 lg:p-4 xl:p-6 border border-border w-full max-w-full min-w-0">
              {/* Content Analysis Card */}
              <div className="bg-white rounded-lg sm:rounded-xl p-1 xs:p-2 sm:p-3 lg:p-4 border border-gray-200 w-full min-w-0 max-w-full">
                <div className="flex items-center justify-between mb-2 xs:mb-3 sm:mb-4">
                  <span className="font-semibold text-gray-900 text-xs xs:text-sm sm:text-base truncate">Content Analysis</span>
                  <div className="flex items-center space-x-1 xs:space-x-2 flex-shrink-0">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-green-600 font-semibold">LOW Risk</span>
                  </div>
                </div>
                <div className="space-y-2 xs:space-y-3 sm:space-y-4">
                  {/* Risk Score Display */}
                  <div className="flex items-center gap-2 xs:gap-3 sm:gap-4 min-w-0">
                    <div className="relative flex-shrink-0">
                      <div className="w-5 h-5 xs:w-6 xs:h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 xl:w-16 xl:h-16 rounded-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                        <span className="text-xs xs:text-sm sm:text-base md:text-lg font-bold text-gray-800">23</span>
                      </div>
                      <div className="absolute inset-0 rounded-full border-2 xs:border-3 sm:border-4 border-green-200"></div>
                      <div 
                        className="absolute inset-0 rounded-full border-2 xs:border-3 sm:border-4 border-green-500"
                        style={{
                          clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%)`,
                          transform: `rotate(${(23 / 100) * 360}deg)`
                        }}
                      ></div>
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden max-w-full">
                      <div className="space-y-1 sm:space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600 truncate">Low</span>
                          <span className="text-xs text-gray-600 truncate">High</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1 xs:h-1.5 sm:h-2">
                          <div 
                            className="bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 h-1 xs:h-1.5 sm:h-2 rounded-full"
                            style={{ width: '23%' }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 text-center">
                          Score: 23/100
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Analysis Summary */}
                  <div className="p-2 xs:p-2 sm:p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-xs text-green-700 font-medium leading-relaxed">
                      ✓ Content safe for monetization
                    </p>
                  </div>
                </div>
              </div>
              {/* Risk Indicators */}
              <div className="grid grid-cols-2 gap-2 xs:gap-3 sm:gap-4 mt-2 xs:mt-3 sm:mt-4 lg:mt-6 min-w-0 max-w-full">
                <div className="bg-white rounded-lg p-2 xs:p-3 sm:p-4 border border-gray-200 min-w-0 max-w-full">
                  <div className="text-xs text-gray-500 mb-1 truncate">Policy Risks</div>
                  <div className="text-xs xs:text-sm sm:text-base md:text-lg font-bold text-green-600 truncate">None</div>
                </div>
                <div className="bg-white rounded-lg p-2 xs:p-3 sm:p-4 border border-gray-200 min-w-0 max-w-full">
                  <div className="text-xs text-gray-500 mb-1 truncate">Suggestions</div>
                  <div className="text-xs xs:text-sm sm:text-base md:text-lg font-bold text-yellow-600 truncate">2</div>
                </div>
              </div>
            </div>
            {/* Floating Elements */}
            <div className="absolute -top-1 -right-1 xs:-top-2 xs:-right-2 sm:-top-4 sm:-right-4 w-3 h-3 xs:w-4 xs:h-4 sm:w-6 sm:h-6 md:w-8 md:h-8 lg:w-12 lg:h-12 xl:w-16 xl:h-16 bg-[#F6C232] rounded-full flex items-center justify-center animate-float shadow-lg">
              <Shield className="h-1.5 w-1.5 xs:h-2 xs:w-2 sm:h-3 sm:w-3 md:h-4 md:w-4 lg:h-6 lg:w-6 xl:h-8 xl:w-8" style={{ stroke: '#171717', fill: 'none' }} />
            </div>
            <div className="absolute -bottom-1 -left-1 xs:-bottom-2 xs:-left-2 sm:-bottom-4 sm:-left-4 w-2 h-2 xs:w-3 xs:h-3 sm:w-4 sm:h-4 md:w-6 md:h-6 lg:w-10 lg:h-10 xl:w-12 xl:h-12 bg-[#00C853] rounded-full flex items-center justify-center animate-float shadow-lg" style={{ animationDelay: '1s' }}>
              <TrendingUp className="h-1 w-1 xs:h-1.5 xs:w-1.5 sm:h-2 sm:w-2 md:h-3 md:w-3 lg:h-5 lg:w-5 xl:h-6 xl:w-6" style={{ stroke: '#FAFAFA', fill: 'none' }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection; 