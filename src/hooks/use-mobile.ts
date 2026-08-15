import * as React from "react"

const MOBILE_BREAKPOINT = 768
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

// Viewport genisligi React'in disinda bir kaynak; useSyncExternalStore tam
// bunun icin var. Onceki hali effect icinde setState cagirip ilk boyamadan
// sonra fazladan bir render turu uretiyordu (react-hooks/set-state-in-effect).
function subscribe(onStoreChange: () => void) {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener("change", onStoreChange)
  return () => mql.removeEventListener("change", onStoreChange)
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches
}

// Sunucuda viewport yok; masaustu varsayiliyor - onceki davranisla ayni
// (isMobile undefined iken !!undefined === false donuyordu).
function getServerSnapshot() {
  return false
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
