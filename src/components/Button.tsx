import { Button as UIButton } from '@/components/ui/button';
import { type ButtonProps as UIButtonProps } from '@/components/ui/button';

interface ButtonProps extends Omit<UIButtonProps, 'variant'> {
  variant?: 'primary' | 'secondary' | 'outlined' | 'danger' | 'success';
  children: React.ReactNode;
}

export default function Button({ variant = 'primary', children, ...props }: ButtonProps) {
  const uiVariant = variant === 'primary' ? 'default' : 
                   variant === 'secondary' ? 'secondary' :
                   variant === 'outlined' ? 'outline' :
                   variant === 'danger' ? 'destructive' :
                   variant === 'success' ? 'success' : 'default';

  return (
    <UIButton variant={uiVariant} {...props}>
      {children}
    </UIButton>
  );
} 