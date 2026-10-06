import React from 'react';
import styles from './Container.module.css';

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
}

export const Container: React.FC<ContainerProps> = ({
  children,
  className = '',
  as: Component = 'div',
  ...rest
}) => {
  return (
    <Component className={`${styles.container} ${className}`} {...rest}>
      {children}
    </Component>
  );
};
