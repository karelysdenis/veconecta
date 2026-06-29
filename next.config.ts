// next.config.ts
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n.ts')

export default withNextIntl({
  serverExternalPackages: ['@prisma/client', 'prisma'],
})
