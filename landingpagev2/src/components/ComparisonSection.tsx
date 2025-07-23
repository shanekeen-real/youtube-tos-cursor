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

const ComparisonSection = () => {
  return (
    <section className="section-padding bg-section">
      <div className="container-custom">
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Why choose{' '}
            <span className="text-gradient">Yellow Dollar</span>?
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Compare our comprehensive solution with other platforms in the market. 
            See why creators trust Yellow Dollar to protect their revenue.
          </p>
        </div>

        <div className="overflow-x-auto animate-scale-in">
          <div className="min-w-[800px]">
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-5 bg-muted/30 border-b border-border">
                <div className="p-4 font-semibold text-foreground">Features</div>
                <div className="p-4 text-center">
                  <div className="font-bold text-primary">Yellow Dollar</div>
                  <div className="text-xs text-muted-foreground mt-1">Our Solution</div>
                </div>
                <div className="p-4 text-center">
                  <div className="font-semibold text-foreground">TubeBuddy</div>
                  <div className="text-xs text-muted-foreground mt-1">Competitor</div>
                </div>
                <div className="p-4 text-center">
                  <div className="font-semibold text-foreground">VidIQ</div>
                  <div className="text-xs text-muted-foreground mt-1">Competitor</div>
                </div>
                <div className="p-4 text-center">
                  <div className="font-semibold text-foreground">Creator Studio</div>
                  <div className="text-xs text-muted-foreground mt-1">YouTube Native</div>
                </div>
              </div>

              {/* Feature Rows */}
              {features.map((feature, index) => (
                <div 
                  key={index} 
                  className={`grid grid-cols-5 border-b border-border ${index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}
                >
                  <div className="p-4 font-medium text-foreground">{feature.name}</div>
                  <div className="p-4 text-center">
                    <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                      feature.yellowDollar ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      {feature.yellowDollar ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <div className="p-4 text-center">
                    <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                      feature.competitor1 ? 'bg-muted text-foreground' : 'bg-muted'
                    }`}>
                      {feature.competitor1 ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <div className="p-4 text-center">
                    <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                      feature.competitor2 ? 'bg-muted text-foreground' : 'bg-muted'
                    }`}>
                      {feature.competitor2 ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <div className="p-4 text-center">
                    <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                      feature.competitor3 ? 'bg-muted text-foreground' : 'bg-muted'
                    }`}>
                      {feature.competitor3 ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground" />
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
};

export default ComparisonSection;