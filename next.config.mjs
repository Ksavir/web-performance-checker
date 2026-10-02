/** @type {import('next').NextConfig} */
const nextConfig = {
  // Estos paquetes usan módulos nativos / rutas de archivos y deben quedar fuera del bundle.
  serverExternalPackages: ['lighthouse', 'chrome-launcher', 'pdfkit'],
};
export default nextConfig;
