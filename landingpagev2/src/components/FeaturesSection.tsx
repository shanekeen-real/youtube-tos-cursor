import { Shield, Zap, BarChart3, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

const features = [
  {
    icon: Shield,
    title: 'Policy Compliance Check',
    description: 'Real-time analysis against YouTube\'s latest monetization policies and community guidelines.'
  },
  {
    icon: Zap,
    title: 'Instant Analysis',
    description: 'Get comprehensive risk assessment in seconds, not hours. Upload content and receive immediate feedback.'
  },
  {
    icon: BarChart3,
    title: 'Revenue Protection',
    description: 'Identify potential demonetization risks before publishing to protect your income stream.'
  },
  {
    icon: AlertTriangle,
    title: 'Risk Assessment',
    description: 'Advanced AI algorithms detect copyright, content, and policy violations with high accuracy.'
  },
  {
    icon: CheckCircle,
    title: 'Fix Recommendations',
    description: 'Get specific, actionable suggestions to resolve issues and maintain monetization status.'
  },
  {
    icon: Clock,
    title: 'Continuous Monitoring',
    description: 'Stay updated with policy changes and re-check your content as guidelines evolve.'
  }
];

const FeaturesSection = () => {
  return (
    <section className="section-padding bg-section">
      <div className="container-custom">
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Everything you need to{' '}
            <span className="text-gradient">stay monetized</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Comprehensive tools and insights to protect your YouTube revenue and maintain compliance 
            with ever-changing platform policies.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="bg-card rounded-xl p-6 border border-border card-hover animate-scale-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;