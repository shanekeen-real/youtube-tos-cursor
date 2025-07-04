import React from 'react';
import Card from './Card';
import Badge from './Badge';
import Button from './Button';
import { useSession } from 'next-auth/react';
import { loadStripe } from '@stripe/stripe-js';
import axios from 'axios';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PricingCardProps {
  tier: 'free' | 'pro' | 'advanced' | 'enterprise';
  title: string;
  price: string;
  description: string;
  features: string[];
  recommended?: boolean;
  badgeText?: string;
  badgeColor?: 'red' | 'yellow' | 'green' | 'blue' | 'gray';
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
  badgeColor = 'blue',
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
        recommended ? 'border-2 border-blue-600 shadow-md' : 'border'
      } ${isCurrentTier ? 'ring-2 ring-green-500' : ''}`}
    >
      {recommended && badgeText && (
        <span className="absolute -top-4 left-1/2 -translate-x-1/2">
          <Badge color={badgeColor}>{badgeText}</Badge>
        </span>
      )}
      
      <div className="w-full">
        <div className="mb-4">
          <h3 className="font-bold text-lg text-[#212121]">{title}</h3>
          <div className="text-3xl font-bold text-[#212121] mt-2">{price}</div>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>

        <ul className="text-sm text-gray-700 space-y-2 mb-6 flex-1">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <span className="text-green-500 mr-2 mt-0.5">✓</span>
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
              variant={recommended ? "blue" : "primary"}
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