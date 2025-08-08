import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, Shield, Zap, Users, Clock, CreditCard, Code, MessageSquare, Play } from 'lucide-react';

const faqs = [
  {
    question: 'How does Yellow Dollar prevent YouTube demonetization?',
    answer: 'Yellow Dollar analyzes your video content against YouTube\'s monetization policies and community guidelines in real-time. Our AI identifies potential demonetization risks before you publish, giving you actionable recommendations to fix issues and maintain your income stream.',
    icon: Shield
  },
  {
    question: 'What types of content can Yellow Dollar analyze for demonetization protection?',
    answer: 'Yellow Dollar analyzes video content, visual frames, audio tracks, transcripts, thumbnails, titles, and descriptions. Our AI examines actual video content, not just transcripts, providing deeper insights into potential demonetization risks.',
    icon: Zap
  },
  {
    question: 'How quickly do I get analysis results?',
    answer: 'Scan times vary based on video length, complexity, and system demand. All scans are processed in the background with real-time progress updates. You\'ll receive notifications when scans complete, allowing you to continue working while analysis runs. Our queue system ensures efficient processing even during high demand.',
    icon: HelpCircle
  },
  {
    question: 'Can I scan my own YouTube videos?',
    answer: 'Yes! Connect your YouTube channel to scan your videos for demonetization risks. You can analyze individual videos or use batch analysis to scan your entire video library. Our platform identifies high-risk content and provides actionable recommendations to protect your revenue.',
    icon: Play
  },
  {
    question: 'Can I use Yellow Dollar for multiple YouTube channels?',
    answer: 'Multiple channel support will be available soon for Advanced tier subscribers. This feature will allow you to monitor all your YouTube channels from a single dashboard. <a href="#pricing-section" className="text-yellow-600 hover:text-yellow-700 underline">View our pricing plans</a> to learn more about upcoming features.',
    icon: Users
  },
  {
    question: 'What happens if YouTube changes their demonetization policies?',
    answer: 'We monitor YouTube policy changes 24/7 and update our analysis algorithms within hours of any policy updates. You can choose to receive notifications about changes that might affect your content and cause demonetization, along with recommendations for staying compliant.',
    icon: Clock
  },
  {
    question: 'Do you offer API access for developers?',
    answer: 'Yes! API access is available for Enterprise customers. Contact us at <a href="mailto:support@yellowdollar.com" class="text-yellow-600 hover:text-yellow-700 underline">support@yellowdollar.com</a> to learn how you can integrate Yellow Dollar\'s YouTube demonetization protection capabilities directly into your existing workflow or content management system.',
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
                        <div 
                          className="text-gray-600 leading-relaxed text-base"
                          dangerouslySetInnerHTML={{ __html: faq.answer }}
                        />
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