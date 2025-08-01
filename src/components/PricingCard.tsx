import React from 'react';
import Card from './Card';
import { Badge } from '@/lib/imports';
import { Button } from '@/lib/imports';
import { useSession } from 'next-auth/react';
import { loadStripe } from '@stripe/stripe-js';
import axios from 'axios';
import { Check } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PricingCardProps {
  tier: 'free' | 'pro' | 'advanced' | 'enterprise';
  title: string;
  price: string;
  description: string;
  features: string[];
  recommended?: boolean;
  badgeText?: string;
  badgeColor?: 'risk' | 'safe' | 'neutral' | 'yellow';
  currentTier?: string;
}

export default function PricingCard({ 
  tier, 
  title, 
  price, 
  description, 
  features, 
  recommended = false, 
  badgeText, 
  badgeColor = 'yellow',
  currentTier 
}: PricingCardProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = React.useState(false);

  const handleUpgrade = async () => {
    if (!session?.user?.id) {
      // Handle authentication - you might want to open auth modal here
      return;
    }

    if (tier === 'free') {
      return; // Free tier doesn't need upgrade
    }

    setLoading(true);
    try {
      const { data } = await axios.post('/api/create-checkout-session', {
        tier: tier
      });
      
      const stripe = await stripePromise;
      if (stripe) {
        await stripe.redirectToCheckout({ sessionId: data.sessionId });
      }
    } catch (error) {
      console.error("Error creating Stripe checkout session:", error);
      alert("Failed to start the upgrade process. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isCurrentTier = currentTier === tier;
  const isUpgrade = currentTier && currentTier !== tier && tier !== 'free';
  const isDowngrade = currentTier && currentTier !== tier && tier === 'free';

  return (
    <Card
      className={`flex flex-col items-start relative h-full ${
        recommended ? 'border-2 border-yellow-500' : 'border-gray-200'
      } ${isCurrentTier ? 'ring-2 ring-safe' : ''}`}
    >
      {recommended && badgeText && (
        <span className="absolute -top-4 left-1/2 -translate-x-1/2">
          <Badge 
            variant={badgeColor} 
            className="!px-4 !py-1"
            style={{ paddingLeft: '16px', paddingRight: '16px', paddingTop: '4px', paddingBottom: '4px' }}
          >
            {badgeText}
          </Badge>
        </span>
      )}
      
      <div className="w-full">
        <div className="mb-6">
          <h3 className="text-title font-semibold text-gray-900">{title}</h3>
          <div className="text-display font-bold text-gray-900 mt-2">{price}</div>
          <p className="text-body text-gray-600 mt-2">{description}</p>
        </div>

        <ul className="text-body text-gray-700 space-y-3 mb-8 flex-1">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <Check className="text-safe mr-3 mt-0.5 h-5 w-5 flex-shrink-0" />
              {feature}
            </li>
          ))}
        </ul>

        <div className="w-full">
          {tier === 'free' ? (
            <Button 
              variant="outlined" 
              className="w-full" 
              disabled
            >
              Current Plan
            </Button>
          ) : isCurrentTier ? (
            <Button 
              variant="outlined" 
              className="w-full" 
              disabled
            >
              Current Plan
            </Button>
          ) : (
            <Button 
              variant={recommended ? "primary" : "secondary"}
              className="w-full" 
              onClick={handleUpgrade}
              disabled={loading}
            >
              {loading ? 'Processing...' : isUpgrade ? 'Upgrade' : 'Get Started'}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
} 