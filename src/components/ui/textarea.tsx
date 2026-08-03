import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        // Yukseklik sabit: onceki field-sizing-content yazdikca alani
        // buyutuyordu ve ust siniri olmadigi icin uzun bir aciklama altindaki
        // butonlari (orn. TaskModal'in Kaydet'i) ekran disina itiyordu. Artik
        // alan `rows` ile belirlenen boyutta kalir, icerik tasarsa kendi icinde
        // kayar. min/max sinirlari kullanici tutamaci surukleyerek buyutse bile
        // layout'un bozulmamasini garantiler; resize-y yatay bozulmayi engeller.
        "flex max-h-[50vh] min-h-16 w-full resize-y overflow-y-auto rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
