import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const config: NextConfig = {
  // Workspace packages ship TypeScript source; Next compiles them.
  transpilePackages: ['@repo/ui', '@repo/pdf-client'],
  reactStrictMode: true,
  poweredByHeader: false,
};

export default withNextIntl(config);
