// prisma/seed.ts
import { PrismaClient, ResourceCategory, ResourceStatus } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  // Countries
  await prisma.country.createMany({
    data: [
      { slug: 'spain', nameEs: 'España', nameEn: 'Spain', namePt: 'Espanha', flag: '🇪🇸' },
      { slug: 'usa', nameEs: 'Estados Unidos', nameEn: 'United States', namePt: 'Estados Unidos', flag: '🇺🇸' },
      { slug: 'colombia', nameEs: 'Colombia', nameEn: 'Colombia', namePt: 'Colômbia', flag: '🇨🇴' },
      { slug: 'brazil', nameEs: 'Brasil', nameEn: 'Brazil', namePt: 'Brasil', flag: '🇧🇷' },
      { slug: 'argentina', nameEs: 'Argentina', nameEn: 'Argentina', namePt: 'Argentina', flag: '🇦🇷', active: false },
      { slug: 'peru', nameEs: 'Perú', nameEn: 'Peru', namePt: 'Peru', flag: '🇵🇪', active: false },
      { slug: 'chile', nameEs: 'Chile', nameEn: 'Chile', namePt: 'Chile', flag: '🇨🇱', active: false },
      { slug: 'mexico', nameEs: 'México', nameEn: 'Mexico', namePt: 'México', flag: '🇲🇽', active: false },
      { slug: 'ecuador', nameEs: 'Ecuador', nameEn: 'Ecuador', namePt: 'Equador', flag: '🇪🇨', active: false },
    ],
    skipDuplicates: true,
  })

  const now = new Date()
  const expiry = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000) // +14 días (umbral rojo)

  // Spain resources (verified by VeConecta — Mallorca)
  const spainResources = [
    {
      countrySlug: 'spain',
      category: ResourceCategory.FIND_FAMILY,
      name: 'Venezuela Te Busca',
      url: 'https://venezuelatebusca.com',
      notesEs: 'Base de datos centralizada con más de 50.000 reportes activos',
      notesEn: 'Centralized database with over 50,000 active reports',
      status: ResourceStatus.PUBLISHED,
      verifiedAt: now,
      verifiedBy: 'VeConecta',
      expiresAt: expiry,
    },
    {
      countrySlug: 'spain',
      category: ResourceCategory.FIND_FAMILY,
      name: 'Cruz Roja Española — Restablecimiento de Contacto',
      url: 'https://www.cruzroja.es',
      phone: '900 22 11 22',
      free: true,
      notesEs: 'Servicio gratuito para localizar familiares en zonas de desastre',
      notesEn: 'Free service to locate family members in disaster zones',
      status: ResourceStatus.PUBLISHED,
      verifiedAt: now,
      verifiedBy: 'VeConecta',
      expiresAt: expiry,
    },
    {
      countrySlug: 'spain',
      category: ResourceCategory.DONATE_MONEY,
      name: 'Cruz Roja Española',
      url: 'https://www2.cruzroja.es/-/ayuda-terremoto-venezuela-2026',
      bizum: '33512',
      notesEs: 'Canal verificado. Bizum 33512 o SMS "VENEZUELA" al 38092 (6€ automáticos)',
      notesEn: 'Verified channel. Bizum 33512 or SMS "VENEZUELA" to 38092 (€6 automatic)',
      status: ResourceStatus.PUBLISHED,
      verifiedAt: now,
      verifiedBy: 'VeConecta',
      expiresAt: expiry,
    },
    {
      countrySlug: 'spain',
      category: ResourceCategory.DONATE_MONEY,
      name: 'World Central Kitchen',
      url: 'https://wck.org',
      bizum: '03843',
      notesEs: 'Desplegada en Venezuela distribuyendo comidas. Bizum disponible desde España.',
      notesEn: 'Deployed in Venezuela distributing meals. Bizum available from Spain.',
      status: ResourceStatus.PUBLISHED,
      verifiedAt: now,
      verifiedBy: 'VeConecta',
      expiresAt: expiry,
    },
    {
      countrySlug: 'spain',
      category: ResourceCategory.SEND_MONEY,
      name: 'Fonmoney',
      url: 'https://fonmoney.com',
      notesEs: 'Opera desde cuentas bancarias españolas. Revisar tarifas actuales en su web.',
      notesEn: 'Works from Spanish bank accounts. Check current rates on their website.',
      status: ResourceStatus.PUBLISHED,
      verifiedAt: now,
      verifiedBy: 'VeConecta',
      expiresAt: expiry,
    },
    {
      countrySlug: 'spain',
      category: ResourceCategory.SEND_MONEY,
      name: 'Retorna',
      url: 'https://retorna.app',
      notesEs: 'App española para remesas a Venezuela. Alerta: han proliferado estafas — usar solo servicios con historial documentado.',
      notesEn: 'Spanish app for remittances to Venezuela. Warning: scams have proliferated — use only services with documented history.',
      status: ResourceStatus.PUBLISHED,
      verifiedAt: now,
      verifiedBy: 'VeConecta',
      expiresAt: expiry,
    },
    {
      countrySlug: 'spain',
      category: ResourceCategory.CALL_FREE,
      name: 'Movistar España',
      notesEs: 'Llamadas gratuitas a Venezuela habilitadas para clientes Movistar desde el 25 de junio.',
      notesEn: 'Free calls to Venezuela enabled for Movistar customers since June 25.',
      status: ResourceStatus.PUBLISHED,
      verifiedAt: now,
      verifiedBy: 'VeConecta',
      expiresAt: expiry,
    },
    {
      countrySlug: 'spain',
      category: ResourceCategory.CALL_FREE,
      name: 'MasOrange',
      notesEs: 'Llamadas gratuitas a Venezuela habilitadas para clientes MasOrange desde el 25 de junio.',
      notesEn: 'Free calls to Venezuela enabled for MasOrange customers since June 25.',
      status: ResourceStatus.PUBLISHED,
      verifiedAt: now,
      verifiedBy: 'VeConecta',
      expiresAt: expiry,
    },
    {
      countrySlug: 'spain',
      category: ResourceCategory.DONATE_PHYSICALLY,
      name: 'Fundación Madrina — Madrid',
      notesEs: 'Canalizado a través de la Diócesis de Caracas. Punto activo con envíos verificados.',
      notesEn: 'Channeled through the Diocese of Caracas. Active point with verified shipments.',
      status: ResourceStatus.PUBLISHED,
      verifiedAt: now,
      verifiedBy: 'VeConecta',
      expiresAt: expiry,
    },
    {
      countrySlug: 'spain',
      category: ResourceCategory.DONATE_PHYSICALLY,
      name: 'Asocaven — Barcelona',
      notesEs: 'Recogida de productos básicos. Confirmar horario antes de ir.',
      notesEn: 'Collection of basic products. Confirm hours before going.',
      status: ResourceStatus.PUBLISHED,
      verifiedAt: now,
      verifiedBy: 'VeConecta',
      expiresAt: expiry,
    },
    {
      countrySlug: 'spain',
      category: ResourceCategory.DONATE_PHYSICALLY,
      name: 'AVEC — Valencia',
      notesEs: 'Asociación Venezolanos Comunitat Valenciana. Coordinación con autoridades locales activa.',
      notesEn: 'Venezuelan Association of Valencia. Active coordination with local authorities.',
      status: ResourceStatus.PUBLISHED,
      verifiedAt: now,
      verifiedBy: 'VeConecta',
      expiresAt: expiry,
    },
    {
      countrySlug: 'spain',
      category: ResourceCategory.CONSULAR,
      name: 'Consulado de Venezuela en Madrid',
      url: 'https://embavenez.es',
      notesEs: 'Gestión de documentos de emergencia: certificados de defunción, pasaportes perdidos. Tiempos extendidos por colapso administrativo.',
      notesEn: 'Emergency documents: death certificates, lost passports. Extended processing times due to administrative overload.',
      status: ResourceStatus.PUBLISHED,
      verifiedAt: now,
      verifiedBy: 'VeConecta',
      expiresAt: expiry,
    },
    {
      countrySlug: 'spain',
      category: ResourceCategory.MENTAL_HEALTH,
      name: 'Teléfono de la Esperanza',
      phone: '717 003 717',
      free: true,
      notesEs: 'Crisis emocionales, 24 horas, gratuito desde cualquier operadora en España.',
      notesEn: 'Emotional crises, 24 hours, free from any carrier in Spain.',
      status: ResourceStatus.PUBLISHED,
      verifiedAt: now,
      verifiedBy: 'VeConecta',
      expiresAt: expiry,
    },
  ]

  for (const resource of spainResources) {
    await prisma.resource.create({ data: resource })
  }

  // Admin user
  await prisma.user.upsert({
    where: { email: 'admin@veconecta.org' },
    update: {},
    create: {
      email: 'admin@veconecta.org',
      role: 'ADMIN',
      isActive: true,
    },
  })

  console.log('Seed complete.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
