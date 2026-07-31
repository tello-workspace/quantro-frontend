"use client";
import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";

// Aceternity UI'in TextHoverEffect'inden uyarlandi, ama orijinali sadece
// ince bir stroke (kontur) kullaniyordu - koyu bir hero arka planinda okunuyor
// ama bizim yumusak/acik gradyanli login arka planimizda neredeyse hic
// gorunmuyordu. Bunun yerine: yazi her zaman tema renkleriyle (--primary/
// --chart-2/--chart-3) dolu ve hafif neon parlamali (SVG blur filtresi)
// gosteriliyor, fareyle gezinince parlama guclenip fareyi takip eden parlak
// bir nokta ekleniyor - "gorunmuyor" sorunu boylece kokten cozuluyor.
export const TextHoverEffect = ({
  text,
  duration,
}: {
  text: string;
  duration?: number;
  automatic?: boolean;
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const [maskPosition, setMaskPosition] = useState({ cx: "50%", cy: "50%" });

  useEffect(() => {
    if (svgRef.current && cursor.x !== null && cursor.y !== null) {
      const svgRect = svgRef.current.getBoundingClientRect();
      const cxPercentage = ((cursor.x - svgRect.left) / svgRect.width) * 100;
      const cyPercentage = ((cursor.y - svgRect.top) / svgRect.height) * 100;
      setMaskPosition({
        cx: `${cxPercentage}%`,
        cy: `${cyPercentage}%`,
      });
    }
  }, [cursor]);

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      viewBox="0 0 300 100"
      xmlns="http://www.w3.org/2000/svg"
      onMouseMove={(e) => setCursor({ x: e.clientX, y: e.clientY })}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="select-none"
    >
      <defs>
        <linearGradient id="quantro-neon-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--primary)" />
          <stop offset="50%" stopColor="var(--chart-2)" />
          <stop offset="100%" stopColor="var(--chart-3)" />
        </linearGradient>

        {/* Neon parlama: bulanik bir kopyayi orijinal yazinin altina birlestirir */}
        <filter id="quantro-neon-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation={hovered ? 4.5 : 2} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <motion.radialGradient
          id="quantro-reveal-mask"
          gradientUnits="userSpaceOnUse"
          r="22%"
          initial={{ cx: "50%", cy: "50%" }}
          animate={maskPosition}
          transition={{ duration: duration ?? 0, ease: "easeOut" }}
        >
          <stop offset="0%" stopColor="white" />
          <stop offset="100%" stopColor="black" />
        </motion.radialGradient>
        <mask id="quantro-text-mask">
          <rect x="0" y="0" width="100%" height="100%" fill="url(#quantro-reveal-mask)" />
        </mask>
      </defs>

      {/* Her zaman gorunen, tema renkli, hafif parlayan marka yazisi */}
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="url(#quantro-neon-gradient)"
        filter="url(#quantro-neon-glow)"
        className="text-7xl font-bold transition-opacity duration-300 ease-out"
        style={{ opacity: hovered ? 1 : 0.6 }}
      >
        {text}
      </text>

      {/* Hover'da fareyi takip eden parlak vurgu - mevcut parlamayi guclendirir */}
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="white"
        mask="url(#quantro-text-mask)"
        filter="url(#quantro-neon-glow)"
        className="text-7xl font-bold"
        style={{ opacity: hovered ? 0.85 : 0 }}
      >
        {text}
      </text>
    </svg>
  );
};
