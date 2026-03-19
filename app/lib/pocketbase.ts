import PocketBase from 'pocketbase';

// Reemplaza esta URL con la URL de tu VPS (por ejemplo, https://api.midominio.com o la IP si tienes acceso HTTP)
const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090';

export const pb = new PocketBase(POCKETBASE_URL);

// Opcional: Deshabilita la cancelación automática si haces peticiones concurrentes
pb.autoCancellation(false);
