import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, Shield, Zap, Users, Clock, CreditCard, Code, MessageSquare } from 'lucide-react';

const faqs = [
  {
    question: 'How does Yellow Dollar protect my YouTube revenue?',
    answer: 'Yellow Dollar analyzes your content against YouTube\'s monetization policies and community guidelines in real-time. Our AI identifies potential demonetization risks before you publish, giving you actionable recommendations to fix issues and maintain your income stream.',
    icon: Shield
  },
  {
    question: 'What types of content can Yellow Dollar analyze?',
    answer: 'Our platform can analyze video content, thumbnails, titles, descriptions, and even audio tracks. We support all major video formats and can process content through direct upload, URL analysis, or API integration.',
    icon: Zap
  },
  {
    question: 'How accurate is the AI risk assessment?',
    answer: 'Our AI has a 98.5% accuracy rate in identifying potential policy violations. We continuously train our models on the latest YouTube policy updates and real-world demonetization cases to maintain high precision.',
    icon: HelpCircle
  },
  {
    question: 'Can I use Yellow Dollar for multiple YouTube channels?',
    answer: 'Yes! All paid plans support multiple channel monitoring. You can add unlimited channels to your account and monitor all of them from a single dashboard.',
    icon: Users
  },
  {
    question: 'What happens if YouTube changes their policies?',
    answer: 'We monitor YouTube policy changes 24/7 and update our analysis algorithms within hours of any policy updates. You\'ll receive notifications about changes that might affect your content, along with recommendations for staying compliant.',
    icon: Clock
  },

  {
    question: 'How quickly do I get analysis results?',
    answer: 'Most content analysis is completed within 30 seconds. Complex or longer content may take up to 2-3 minutes. You\'ll receive real-time updates during the analysis process.',
    icon: Zap
  },
  {
    question: 'Do you offer API access for developers?',
    answer: 'Yes! Our Advanced and Enterprise plans include full API access. You can integrate Yellow Dollar\'s analysis capabilities directly into your existing workflow or content management system.',
    icon: Code
  }
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="w-full py-16 mt-24">
      <div className="w-full">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-2xl mb-6">
            <MessageSquare className="h-8 w-8 text-yellow-600" />
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Have questions about protecting your YouTube revenue? 
            We've got answers to help you get started.
          </p>
        </div>

        <div className="w-full">
          <div className="grid gap-6">
            {faqs.map((faq, index) => {
              const IconComponent = faq.icon;
              return (
                <div 
                  key={index}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-gray-300 transition-all duration-200"
                >
                  <button
                    className="w-full px-8 py-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors group"
                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  >
                                         <div className="flex items-center gap-4 flex-1">
                       <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0">
                         <IconComponent className="h-5 w-5 text-yellow-600" />
                       </div>
                       <div className="flex-1">
                         <span className="font-semibold text-gray-900 text-left block group-hover:text-yellow-600 transition-colors">
                           {faq.question}
                         </span>
                       </div>
                     </div>
                    <div className="ml-4 flex-shrink-0">
                      {openIndex === index ? (
                        <ChevronUp className="h-5 w-5 text-yellow-600 transition-transform duration-200" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400 group-hover:text-yellow-600 transition-all duration-200" />
                      )}
                    </div>
                  </button>
                  {openIndex === index && (
                    <div className="px-8 pb-6 animate-fade-in">
                      <div className="pl-14">
                        <div className="h-px bg-gray-200 mb-4"></div>
                        <p className="text-gray-600 leading-relaxed text-base">
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
} 