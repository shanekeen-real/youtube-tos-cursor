import { Button } from '@/components/ui/button';
import { Play, Shield, TrendingUp } from 'lucide-react';

const HeroSection = () => {
  return (
    <section className="section-padding bg-background">
      <div className="container-custom">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <div className="text-center lg:text-left animate-fade-in-up">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
              Protect Your{' '}
              <span className="text-gradient">YouTube Revenue</span>{' '}
              from Demonetization
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl">
              Analyze YouTube policies and video content instantly. Get AI-powered risk 
              assessment and fix recommendations to keep your channel monetized.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button size="lg" className="btn-hover">
                Try for Free
              </Button>
              <Button variant="outline" size="lg" className="btn-hover">
                <Play className="h-4 w-4 mr-2" />
                Watch Demo
              </Button>
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
          <div className="relative animate-scale-in">
            <div className="relative bg-gradient-to-br from-primary/10 to-accent/10 rounded-3xl p-8 border border-border">
              <div className="space-y-4">
                {/* Mock Interface */}
                <div className="bg-card rounded-xl p-6 border border-border">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Content Analysis</h3>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-success rounded-full"></div>
                      <span className="text-xs text-success">Safe</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Policy Compliance</span>
                      <span className="text-success font-medium">98%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-success h-2 rounded-full" style={{ width: '98%' }}></div>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-success/10 rounded-lg border border-success/20">
                    <p className="text-sm text-success-foreground">
                      ✓ Content meets YouTube monetization guidelines
                    </p>
                  </div>
                </div>
                
                {/* Risk Indicators */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-card rounded-lg p-4 border border-border">
                    <div className="text-xs text-muted-foreground mb-1">Copyright Risk</div>
                    <div className="text-lg font-bold text-success">Low</div>
                  </div>
                  <div className="bg-card rounded-lg p-4 border border-border">
                    <div className="text-xs text-muted-foreground mb-1">Content Score</div>
                    <div className="text-lg font-bold text-primary">A+</div>
                  </div>
                </div>
              </div>
              
              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 w-16 h-16 bg-primary rounded-full flex items-center justify-center animate-float">
                <Shield className="h-8 w-8 text-primary-foreground" />
              </div>
              <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-success rounded-full flex items-center justify-center animate-float" style={{ animationDelay: '1s' }}>
                <TrendingUp className="h-6 w-6 text-success-foreground" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;