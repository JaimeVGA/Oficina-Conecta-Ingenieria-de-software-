import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Oficina Conecta — Sistema Web de Gestión Multisede',
  description:
    'Plataforma multisede (CDMX, Oaxaca, Puebla) para seguimiento de proyectos, tareas, autorizaciones atómicas, control documental y calendario .ics.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
