import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type IconVariant = 'default' | 'muted' | 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'danger';

interface IconWrapperProps extends React.SVGAttributes<SVGElement> {
  icon: LucideIcon;
  variant?: IconVariant;
  size?: number;
}

/**
 * Wrapper component that applies consistent color styling to all icons.
 * Uses design system color tokens to ensure visual consistency across the app.
 * 
 * @param icon - The Lucide icon component to render
 * @param variant - Color variant (default, muted, primary, secondary, accent, success, warning, danger)
 * @param size - Icon size in pixels (default: 24)
 */
export const IconWrapper: React.FC<IconWrapperProps> = ({ 
  icon: Icon, 
  variant = 'default',
  size = 24,
  className,
  ...props 
}) => {
  const variantClasses = {
    default: 'text-icon-default',
    muted: 'text-icon-muted',
    primary: 'text-icon-primary',
    secondary: 'text-icon-secondary',
    accent: 'text-icon-accent',
    success: 'text-icon-success',
    warning: 'text-icon-warning',
    danger: 'text-icon-danger',
  };

  return (
    <Icon 
      size={size}
      className={cn(variantClasses[variant], className)}
      {...props}
    />
  );
};
