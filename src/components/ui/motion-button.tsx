"use client"

import { motion } from "framer-motion"

import { Button } from "@/components/ui/button"

// Button'un ustune framer-motion hover/tap scale animasyonu ekler. Ayri bir
// component - Button'un kendisini degistirmiyoruz cunku uygulamadaki her
// buton (kucuk ikon butonlari dahil) icin bu animasyon uygun olmayabilir;
// bunun yerine one cikmasi istenen aksiyon butonlarinda opsiyonel kullanilir.
export const MotionButton = motion.create(Button)
