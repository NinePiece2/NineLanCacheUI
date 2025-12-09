"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface AnimatedPageProps {
  children: ReactNode;
  className?: string;
}

export function AnimatedPage({ children, className = "" }: AnimatedPageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedCard({
  children,
  delay = 0,
  className = "",
}: AnimatedPageProps & { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function FadeIn({
  children,
  delay = 0,
  className = "",
}: AnimatedPageProps & { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function SlideIn({
  children,
  delay = 0,
  direction = "left",
  className = "",
}: AnimatedPageProps & {
  delay?: number;
  direction?: "left" | "right" | "up" | "down";
}) {
  const directionMap = {
    left: { x: -20, y: 0 },
    right: { x: 20, y: 0 },
    up: { x: 0, y: -20 },
    down: { x: 0, y: 20 },
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...directionMap[direction] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function ScaleIn({
  children,
  delay = 0,
  className = "",
}: AnimatedPageProps & { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerContainer({
  children,
  className = "",
}: AnimatedPageProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: 0.1,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = "" }: AnimatedPageProps) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.4 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
