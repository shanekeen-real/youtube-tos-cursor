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
              <div className="bg-white rounded-xl p-6 border border-border w-full">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-semibold">Content Analysis</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-[#00C853] rounded-full"></div>
                    <span className="text-xs text-[#00C853] font-semibold">Safe</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Policy Compliance</span>
                    <span className="text-[#00C853] font-medium">98%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-[#00C853] h-2 rounded-full" style={{ width: '98%' }}></div>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-[#00C8531A] rounded-lg border border-[#00C85333]">
                  <p className="text-sm text-[#00C853] font-medium">
                    ✓ Content meets YouTube monetization guidelines
                  </p>
                </div>
              </div>
              {/* Risk Indicators (now siblings, not inside Content Analysis card) */}
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-white rounded-lg p-4 border border-border">
                  <div className="text-xs text-muted-foreground mb-1">Copyright Risk</div>
                  <div className="text-lg font-bold text-success">Low</div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-border">
                  <div className="text-xs text-muted-foreground mb-1">Content Score</div>
                  <div className="text-lg font-bold text-primary">A+</div>
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