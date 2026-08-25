'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import type { ReactNode } from 'react';

const fadeIn = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

const scrollReveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
};

const baseTransition = { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const };

type DivProps = HTMLMotionProps<'div'> & { children?: ReactNode };

export function FadeIn({ children, delay = 0, ...rest }: DivProps & { delay?: number }) {
  return (
    <motion.div
      initial={fadeIn.initial}
      animate={fadeIn.animate}
      transition={{ ...baseTransition, delay }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function ScrollReveal({ children, delay = 0, ...rest }: DivProps & { delay?: number }) {
  return (
    <motion.div
      initial={scrollReveal.initial}
      whileInView={scrollReveal.whileInView}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ ...baseTransition, delay }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
