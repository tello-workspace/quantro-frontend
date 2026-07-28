'use client'

import { useState, type ReactNode } from 'react'
import { Provider } from 'react-redux'
import { makeStore } from './store'

// Redux React dünyasına aittir, server component'lerde çalışmaz.
// Bu yüzden Provider'ı "use client" işaretli bu bileşene hapsediyoruz;
// layout.tsx server component olarak kalır, çocukları bununla sarar.
//
// Store'un render sırasında sadece BİR KEZ oluşturulması gerekiyor; lazy
// initializer'lı useState bunu ref'e render sırasında yazmadan sağlıyor.
export default function StoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => makeStore())
  return <Provider store={store}>{children}</Provider>
}
