"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";

export function Logo({ size = 40 }: { size?: number }) {
  const [animate, setAnimate] = useState(false);

  return (
    <motion.div
      className="cursor-pointer select-none inline-flex items-center gap-2"
      onClick={() => setAnimate(true)}
      onAnimationComplete={() => setAnimate(false)}
      animate={
        animate
          ? {
              scale: [1, 1.15, 1],
              rotate: [0, 5, -5, 0],
              filter: [
                "drop-shadow(0 0 0px rgba(59,130,246,0))",
                "drop-shadow(0 0 20px rgba(59,130,246,0.8))",
                "drop-shadow(0 0 0px rgba(59,130,246,0))",
              ],
            }
          : {}
      }
      transition={{ duration: 0.6, ease: "easeInOut" }}
    >
      <Image
        src="/Askify_logo.png"
        alt="Askify"
        width={size}
        height={size}
        className="rounded-lg"
      />
    </motion.div>
  );
}

export function LogoWithText({ size = 36 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <Logo size={size} />
      <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
        Askify
      </span>
    </div>
  );
}
