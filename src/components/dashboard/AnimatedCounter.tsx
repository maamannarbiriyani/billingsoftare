"use client";

import { useEffect, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

export function AnimatedCounter({ 
  value, 
  prefix = "", 
  suffix = "",
  decimals = 0,
}: { 
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const [mounted, setMounted] = useState(false);
  
  const spring = useSpring(0, {
    stiffness: 50,
    damping: 15,
    mass: 1,
    bounce: 0
  });

  const display = useTransform(spring, (current) => {
    return `${prefix}${current.toLocaleString("en-IN", { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    })}${suffix}`;
  });

  useEffect(() => {
    setMounted(true);
    spring.set(value);
  }, [spring, value]);

  if (!mounted) {
    return (
      <span>
        {prefix}
        {value.toLocaleString("en-IN", { 
          minimumFractionDigits: decimals, 
          maximumFractionDigits: decimals 
        })}
        {suffix}
      </span>
    );
  }

  return <motion.span>{display}</motion.span>;
}
