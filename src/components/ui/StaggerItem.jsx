import React from 'react';
import { motion } from 'framer-motion';

export default function StaggerItem({ children, index = 0, className }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.07 * index, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}