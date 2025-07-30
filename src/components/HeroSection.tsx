import React, { useContext } from 'react';
import { UIButton as Button } from '@/lib/imports';
import { AuthContext } from '@/lib/imports';
import { useRouter } from 'next/navigation';
import { Play, Shield, TrendingUp } from 'lucide-react';

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
    <section className="section-padding bg-background pt-12">
      <div className="container-custom">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Text Content */}
          <div className="text-center lg:text-left animate-fade-in-up">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Protect Your <span className="text-gradient text-transparent block">YouTube Revenue</span>
              <span className="block">from Demonetization</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto lg:mx-0">
              Analyze YouTube policies and video content instantly. Get AI-powered risk assessment and fix recommendations to keep your channel monetized.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-6">
              <Button size="lg" className="btn-hover" onClick={handleTryForFree}>
                Try for Free
              </Button>
              <div className="relative group">
                <Button variant="outline" size="lg" className="btn-hover">
                  <Play className="h-4 w-4 mr-2" />
                  Watch Demo
                </Button>
                <div className="absolute left-1/2 -translate-x-1/2 mt-2 px-3 py-2 rounded-lg bg-gray-900 text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20 whitespace-nowrap">
                  Coming soon
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center lg:justify-start space-x-6 mt-8 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-success" />
                <span>Free to start</span>
              </div>
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-success" />
                <span>AI-powered analysis</span>
              </div>
            </div>
          </div>

          {/* Hero Visual */}
          <div className="relative animate-scale-in h-full flex flex-col justify-center">
            <div className="relative bg-gradient-to-br from-[#F6C2321A] to-[#1717171A] rounded-3xl p-8 border border-border w-full">
              {/* Content Analysis Card */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 w-full">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-semibold text-gray-900">Content Analysis</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-green-600 font-semibold">LOW Risk</span>
                  </div>
                </div>
                <div className="space-y-4">
                  {/* Risk Score Display */}
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                        <span className="text-lg font-bold text-gray-800">23</span>
                      </div>
                      <div className="absolute inset-0 rounded-full border-4 border-green-200"></div>
                      <div 
                        className="absolute inset-0 rounded-full border-4 border-green-500"
                        style={{
                          clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%)`,
                          transform: `rotate(${(23 / 100) * 360}deg)`
                        }}
                      ></div>
                    </div>
                    <div className="flex-1">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">Low Risk</span>
                          <span className="text-xs text-gray-600">High Risk</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 h-2 rounded-full"
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
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-700 font-medium">
                      ✓ Content appears safe for monetization
                    </p>
                  </div>
                </div>
              </div>
              {/* Risk Indicators */}
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Policy Risks</div>
                  <div className="text-lg font-bold text-green-600">None</div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Suggestions</div>
                  <div className="text-lg font-bold text-yellow-600">2</div>
                </div>
              </div>
            </div>
            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-[#F6C232] rounded-full flex items-center justify-center animate-float shadow-lg">
              <Shield className="h-8 w-8" style={{ stroke: '#171717', fill: 'none' }} />
            </div>
            <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-[#00C853] rounded-full flex items-center justify-center animate-float shadow-lg" style={{ animationDelay: '1s' }}>
              <TrendingUp className="h-6 w-6" style={{ stroke: '#FAFAFA', fill: 'none' }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection; 