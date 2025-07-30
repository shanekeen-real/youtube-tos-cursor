import React from 'react';
import { Shield, Zap, BarChart3, AlertTriangle } from 'lucide-react';

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
  }
];

export default function FeaturesSection() {
  return (
    <section className="w-full py-16 mt-48">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <div className="text-sm font-medium text-yellow-600 mb-2">Features</div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Beautiful analytics to grow smarter
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Powerful, self-serve product and growth analytics to help you convert, engage, and retain more users. Trusted by over 4,000 startups.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-lg transition-shadow duration-300 flex flex-col h-full"
            >
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                <feature.icon className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 text-left">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed text-left mb-4 flex-grow">
                {feature.description}
              </p>
              <a href="#" className="text-yellow-600 hover:text-yellow-700 font-medium text-sm inline-flex items-center text-left mt-auto">
                Learn more →
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
} 