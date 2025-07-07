import { Badge as UIBadge } from '@/components/ui/badge';
import { type BadgeProps as UIBadgeProps } from '@/components/ui/badge';
import { type ReactNode } from 'react';

interface BadgeProps extends Omit<UIBadgeProps, 'variant'> {
  variant?: 'risk' | 'safe' | 'neutral' | 'yellow';
  children: ReactNode;
}

export default function Badge({ variant = 'neutral', children, ...props }: BadgeProps) {
  const uiVariant = variant === 'risk' ? 'risk' :
                   variant === 'safe' ? 'safe' :
                   variant === 'neutral' ? 'neutral' :
                   variant === 'yellow' ? 'default' : 'neutral';

  return (
    <UIBadge variant={uiVariant} {...props}>
      {children}
    </UIBadge>
  );
} 