'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [checked, setChecked] = useState(false);
    useEffect (() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.replace('/login');
            return;
        }
        setChecked(true);
    }, [router]);

    if (!checked){
        return null;
    }
    return (
    <>
      <Header />
      {children} 
    </>
  );
}