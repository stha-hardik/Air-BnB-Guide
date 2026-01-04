
import React from 'react';

// Using AllHTMLAttributes instead of InputHTMLAttributes to properly support 'rows' for textareas and other multi-element attributes
interface InputProps extends React.AllHTMLAttributes<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> {
  label: string;
  as?: 'input' | 'textarea' | 'select';
  children?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, as = 'input', className = '', children, ...props }) => {
  const Component = as;
  const baseStyles = "w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition-all duration-200 text-sm text-slate-900 bg-white";
  
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
        {label}
      </label>
      <Component 
        className={`${baseStyles} ${className}`}
        {...(props as any)}
      >
        {children}
      </Component>
    </div>
  );
};
