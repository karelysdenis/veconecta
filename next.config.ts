// next.config.ts
import path from 'path'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n.ts')

export default withNextIntl({
  serverExternalPackages: ['@prisma/client', 'prisma'],
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
})
