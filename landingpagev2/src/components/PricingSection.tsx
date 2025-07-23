import { Button } from '@/components/ui/button';
import { Check, Star } from 'lucide-react';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Get started with basic YouTube channel scan and suggestions.',
    features: [
      'YouTube channel scan per month',
      '1 suggestion per scan (limited)',
      'Single video scan',
      'Basic revenue at risk calculator',
      'Custom CM/MCN settings',
      'Comment policy analysis (advanced)'
    ],
    cta: 'Get Started',
    popular: false
  },
  {
    name: 'Pro',
    price: '$12.50',
    period: 'per month',
    description: 'For creators who need more scans, suggestions, and expert features.',
    features: [
      '30 YouTube channel scans per month',
      'Single video scan',
      'Full revenue at risk calculator',
      'Export reports (PDF/CSV)',
      'Monetization risk alerts',
      '+2 more features'
    ],
    cta: 'Choose Pro',
    popular: true
  },
  {
    name: 'Advanced',
    price: '$40.83',
    period: 'per month',
    description: 'For creators and professionals with more extensive monitoring work and analytics.',
    features: [
      'Unlimited YouTube channel scans',
      'All suggestions per scan (10+)',
      'Single & bulk video scan',
      'Full revenue at risk calculator',
      'Export reports (PDF/CSV)',
      'Monetization risk alerts',
      '+6 more features'
    ],
    cta: 'Choose Advanced',
    popular: false
  },
  {
    name: 'Enterprise',
    price: 'Contact',
    period: 'us',
    description: 'Custom solutions for large organizations and agencies.',
    features: [
      'Custom YouTube channel scan limits',
      'All suggestions per scan (50+)',
      'Full revenue at risk calculator',
      'Export reports (PDF/CSV)',
      'Monetization risk alerts',
      '+7 more features'
    ],
    cta: 'Contact Sales',
    popular: false
  }
];

const PricingSection = () => {
  return (
    <section className="section-padding bg-background" id="pricing">
      <div className="container-custom">
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Choose Your{' '}
            <span className="text-gradient">Plan</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Start free and scale as your channel grows. All plans include our core 
            revenue protection features.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((plan, index) => (
            <div 
              key={index}
              className={`relative bg-card rounded-xl border p-6 card-hover animate-scale-in ${
                plan.popular 
                  ? 'border-primary ring-2 ring-primary/20' 
                  : 'border-border'
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="flex items-center space-x-1 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
                    <Star className="h-3 w-3" />
                    <span>Most Popular</span>
                  </div>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-foreground mb-2">{plan.name}</h3>
                <div className="mb-2">
                  <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                  {plan.period !== 'us' && (
                    <span className="text-muted-foreground ml-1">/{plan.period}</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start space-x-3">
                    <Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button 
                className={`w-full btn-hover ${
                  plan.popular 
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                    : ''
                }`}
                variant={plan.popular ? 'default' : 'outline'}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>

        <div className="text-center mt-12 animate-fade-in-up">
          <p className="text-muted-foreground">
            All plans include a 14-day free trial. No credit card required to start.
          </p>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;