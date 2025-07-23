import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const faqs = [
  {
    question: 'How does Yellow Dollar protect my YouTube revenue?',
    answer: 'Yellow Dollar analyzes your content against YouTube\'s monetization policies and community guidelines in real-time. Our AI identifies potential demonetization risks before you publish, giving you actionable recommendations to fix issues and maintain your income stream.'
  },
  {
    question: 'What types of content can Yellow Dollar analyze?',
    answer: 'Our platform can analyze video content, thumbnails, titles, descriptions, and even audio tracks. We support all major video formats and can process content through direct upload, URL analysis, or API integration.'
  },
  {
    question: 'How accurate is the AI risk assessment?',
    answer: 'Our AI has a 98.5% accuracy rate in identifying potential policy violations. We continuously train our models on the latest YouTube policy updates and real-world demonetization cases to maintain high precision.'
  },
  {
    question: 'Can I use Yellow Dollar for multiple YouTube channels?',
    answer: 'Yes! All paid plans support multiple channel monitoring. You can add unlimited channels to your account and monitor all of them from a single dashboard.'
  },
  {
    question: 'What happens if YouTube changes their policies?',
    answer: 'We monitor YouTube policy changes 24/7 and update our analysis algorithms within hours of any policy updates. You\'ll receive notifications about changes that might affect your content, along with recommendations for staying compliant.'
  },
  {
    question: 'Is there a free trial available?',
    answer: 'Yes! We offer a 14-day free trial on all paid plans. You can explore all features without providing a credit card. The Free plan is available forever with basic features.'
  },
  {
    question: 'How quickly do I get analysis results?',
    answer: 'Most content analysis is completed within 30 seconds. Complex or longer content may take up to 2-3 minutes. You\'ll receive real-time updates during the analysis process.'
  },
  {
    question: 'Do you offer API access for developers?',
    answer: 'Yes! Our Advanced and Enterprise plans include full API access. You can integrate Yellow Dollar\'s analysis capabilities directly into your existing workflow or content management system.'
  }
];

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="section-padding bg-section">
      <div className="container-custom">
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Frequently Asked{' '}
            <span className="text-gradient">Questions</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Have questions about protecting your YouTube revenue? 
            We've got answers to help you get started.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div 
                key={index}
                className="bg-card rounded-xl border border-border overflow-hidden animate-scale-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <button
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-muted/30 transition-colors"
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                >
                  <span className="font-semibold text-foreground pr-4">
                    {faq.question}
                  </span>
                  {openIndex === index ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  )}
                </button>
                {openIndex === index && (
                  <div className="px-6 pb-4 animate-fade-in-up">
                    <p className="text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;