import { Button } from '@/components/ui/button';
import { TrendingUp, DollarSign, Shield, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const benefits = [
  {
    icon: DollarSign,
    title: 'Maximize Revenue',
    description: 'Prevent demonetization and maintain consistent income from your content.',
    type: 'success'
  },
  {
    icon: Shield,
    title: 'Risk Mitigation',
    description: 'Identify and fix potential issues before they impact your channel.',
    type: 'success'
  },
  {
    icon: Clock,
    title: 'Save Time',
    description: 'Automated analysis saves hours of manual policy checking.',
    type: 'success'
  },
  {
    icon: TrendingUp,
    title: 'Channel Growth',
    description: 'Focus on creating content while we handle compliance monitoring.',
    type: 'success'
  }
];

const BenefitsSection = () => {
  return (
    <section className="section-padding bg-background">
      <div className="container-custom">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <div className="animate-fade-in-up">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
              Keep your revenue{' '}
              <span className="text-gradient">safe and growing</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Don't let policy violations destroy months of hard work. Our AI-powered platform 
              helps creators maintain monetization and build sustainable income streams.
            </p>
            
            <div className="space-y-6 mb-8">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <benefit.icon className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{benefit.title}</h3>
                    <p className="text-muted-foreground">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <Button size="lg" className="btn-hover">
              Start Protecting Your Revenue
            </Button>
          </div>

          {/* Visual Dashboard */}
          <div className="relative animate-scale-in">
            <div className="bg-card rounded-2xl p-6 border border-border">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Revenue Safety Dashboard</h3>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-success rounded-full"></div>
                  <span className="text-sm text-success">All Systems Safe</span>
                </div>
              </div>
              
              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-success/5 rounded-lg p-4 border border-success/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-success">$12,450</div>
                      <div className="text-xs text-muted-foreground">Protected Revenue</div>
                    </div>
                    <CheckCircle className="h-6 w-6 text-success" />
                  </div>
                </div>
                <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-primary">98.5%</div>
                      <div className="text-xs text-muted-foreground">Compliance Score</div>
                    </div>
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </div>

              {/* Recent Checks */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">Recent Checks</h4>
                {[
                  { title: 'Gaming Tutorial #47', status: 'safe', time: '2 min ago' },
                  { title: 'Product Review: Tech', status: 'safe', time: '1 hour ago' },
                  { title: 'Vlog: Daily Life', status: 'warning', time: '3 hours ago' }
                ].map((check, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {check.status === 'safe' ? (
                        <CheckCircle className="h-4 w-4 text-success" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-primary" />
                      )}
                      <span className="text-sm font-medium">{check.title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{check.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );