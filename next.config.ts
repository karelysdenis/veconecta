// next.config.ts
import path from 'path'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n.ts')

export default withNextIntl({
  serverExternalPackages: ['@prisma/client', 'prisma'],
  turbopack: {
    root: path.resolve(__dirname),
  },
})
