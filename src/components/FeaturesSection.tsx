import React from 'react';
import { Shield, Zap, BarChart3, AlertTriangle } from 'lucide-react';
import GlowCard from '@/components/ui/spotlight-card';

const features = [
  {
    icon: Shield,
    title: 'Multi-Modal Video Analysis',
    description: 'Analyze actual video content, not just transcripts. Our AI examines visual elements, scenes, and actions to catch policy violations that text analysis misses.'
  },
  {
    icon: Zap,
    title: 'Comprehensive Policy Analysis',
    description: 'Complete analysis across all YouTube policy categories including content safety, community standards, advertiser-friendly guidelines, and legal compliance.'
  },
  {
    icon: BarChart3,
    title: 'Advanced Transcript Highlighting',
    description: 'See exactly which words and phrases are flagged with visual highlighting. Get context-aware explanations and understand why content might be at risk of demonetization.'
  },
  {
    icon: AlertTriangle,
    title: 'AI-Generated Content Detection',
    description: 'Detect AI-generated content that could hurt your channel. Our advanced AI identifies patterns that may trigger YouTube\'s AI detection systems.'
  }
];

export default function FeaturesSection() {
  return (
    <section className="w-full py-16 mt-48">
      <div className="w-full">
        <div className="mb-16 text-center">
          <div className="text-sm font-medium text-yellow-600 mb-2">Features</div>
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
          AI-Powered YouTube Protection
        </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Advanced AI technology that scans your content against YouTube's latest policies to identify and prevent demonetization risks before they impact your revenue.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <GlowCard key={index} glowColor="orange" customSize className="rounded-xl">
              <div className="bg-white rounded-xl p-6 border border-transparent shadow-sm flex flex-col h-full">
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
            </GlowCard>
          ))}
        </div>
      </div>
    </section>
  );
} 