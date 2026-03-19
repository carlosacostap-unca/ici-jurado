import { redirect } from 'next/navigation';

export default function Home() {
  // Redirigimos automáticamente a la página de login
  redirect('/login');
}
