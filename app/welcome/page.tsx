"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { pb } from '../lib/pocketbase';

export default function WelcomeDispatcher() {
  const router = useRouter();

  useEffect(() => {
    // Si no está autenticado, redirigir al login
    if (!pb.authStore.isValid || !pb.authStore.model) {
      router.push('/login');
      return;
    }

    // Redirigir según el rol
    const role = pb.authStore.model.role;
    if (role === 'admin') {
      router.push('/welcome/admin');
    } else {
      router.push('/welcome/jurado');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-xl font-medium text-slate-400">Redirigiendo a tu panel...</div>
    </div>
  );
}
