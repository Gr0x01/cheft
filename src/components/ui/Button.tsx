import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'emergency' | 'brutal';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  skewed?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', skewed = false, children, ...props }, ref) => {
    const baseClasses = `
      btn-brutal relative overflow-hidden
      transition-all duration-200 ease-out
      disabled:pointer-events-none disabled:opacity-50
      inline-flex items-center justify-center
      text-body-brutal font-bold
    `;
    
    const variantClasses = {
      primary: 'btn-brutal-primary',
      secondary: 'btn-brutal-secondary',
      outline: 'btn-brutal-secondary',
      ghost: 'btn-brutal-ghost',
      emergency: 'btn-brutal-primary bg-safety-orange text-absolute-black border-safety-orange',
      brutal: 'btn-brutal-primary'
    };
    
    const sizeClasses = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-6 py-3 text-base',
      lg: 'px-8 py-4 text-lg',
      xl: 'px-12 py-6 text-xl'
    };
    
    const skewStyle = skewed ? { transform: 'skew(-3deg)' } : {};
    
    return (
      <button
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        style={skewStyle}
        ref={ref}
        {...props}
      >
        <span className="relative z-10 flex items-center gap-2 uppercase tracking-wider">
          {children}
        </span>
        
        {/* Industrial loading animation overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-safety-orange to-transparent opacity-0 hover:opacity-20 transition-opacity duration-300 -translate-x-full hover:translate-x-full transform skew-x-12" />
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
export type { ButtonProps };