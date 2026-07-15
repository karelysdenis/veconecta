import { setRequestLocale } from 'next-intl/server'
import { InstagramEmbed } from '@/components/InstagramEmbed'
import { STATIC_PAGE_LOCALES } from '@/lib/locale-content'
import { getActiveLocales } from '@/lib/locale-active'
import { buildAlternates } from '@/lib/hreflang'
import type { Metadata } from 'next'

const INSTAGRAM_POSTS = [
  'https://www.instagram.com/p/DaJDAHrAUXF/',
  'https://www.instagram.com/reel/DaATx6Jjaoi/',
]

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const isEn = locale === 'en'
  const activeLocales = await getActiveLocales()
  const activeCodes = activeLocales.map((l) => l.code)
  const pageLocales = (STATIC_PAGE_LOCALES.sobre ?? activeCodes).filter((l) => activeCodes.includes(l))
  return {
    title: isEn ? 'About VEconecta' : 'Sobre VEconecta',
    description: isEn
      ? 'Why VEconecta exists and why we prioritize independent humanitarian organizations.'
      : 'Por qué existe VEconecta y por qué priorizamos organizaciones humanitarias independientes.',
    openGraph: {
      type: 'website',
      siteName: 'VEconecta',
      images: [{ url: `/api/og?locale=${locale}`, width: 1200, height: 630 }],
    },
    alternates: buildAlternates(locale, pageLocales, (l) => `/${l}/sobre`),
  }
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const isEn = locale === 'en'

  return (
    <main className="min-h-screen bg-white px-5 pt-8 pb-10">
      {isEn ? <AboutContentEn /> : <AboutContentEs />}

      <div className="mt-10 pt-8 border-t border-[rgba(20,20,20,0.08)] space-y-6">
        {INSTAGRAM_POSTS.map((url) => (
          <InstagramEmbed key={url} url={url} />
        ))}
      </div>
    </main>
  )
}

function AboutContentEs() {
  return (
    <div className="space-y-5 font-sans font-light text-[15px] text-[#141414] leading-relaxed">
      <h2 className="font-display font-bold text-[19px] text-[#141414]">
        Sobre la crisis
      </h2>
      <p>
        El miércoles 24 de junio, Venezuela fue sacudida por dos poderosos terremotos de magnitudes
        7,2 y 7,5 que ocurrieron con apenas segundos de diferencia. Los sismos provocaron daños
        catastróficos en la costa norte del país, afectando especialmente al estado La Guaira, la
        ciudad de Caracas y varias zonas del estado Miranda.
      </p>
      <p>
        Según Reuters, hasta el lunes 6 de julio, la cifra oficial de fallecidos ascendía a 3.535
        personas. El gobierno venezolano informó que cerca de 30.000 funcionarios nacionales de
        emergencia y 3.281 rescatistas internacionales han sido desplegados para apoyar las labores
        de búsqueda, rescate y recuperación. Cerca de 17.854 personas han quedado sin hogar, mientras
        que un registro no oficial, pero ampliamente utilizado por organizaciones y familiares,
        reporta más de 41.000 personas desaparecidas.
      </p>
      <p>
        La magnitud de la destrucción ha dejado a miles de familias desplazadas, ha sobrepasado la
        capacidad de hospitales y servicios de emergencia, ha dañado infraestructura crítica y ha
        dejado comunidades enteras buscando a sus seres queridos entre los escombros. Aunque las
        labores de rescate continúan, las necesidades humanitarias se extenderán mucho más allá de
        la respuesta inmediata. Miles de familias necesitarán refugio, alimentos, atención médica,
        agua potable, apoyo psicológico y asistencia a largo plazo para reconstruir sus vidas.
      </p>

      <p>
        Somos un grupo de venezolanas en la diáspora que creamos esta iniciativa tras los
        terremotos del 24 de junio.
      </p>

      <h2 className="font-display font-bold text-[19px] text-[#141414] pt-2">
        ¿Por qué existe VEconecta?
      </h2>
      <p>
        VEconecta nació con el propósito de servir como un centro de información para las personas
        que desean ayudar desde fuera de Venezuela. Nuestro objetivo es conectar a donantes,
        voluntarios, organizaciones y miembros de la diáspora venezolana con recursos confiables y
        verificados para que la ayuda llegue a las comunidades afectadas de la manera más rápida y
        efectiva posible.
      </p>
      <p>
        Ya sea que desees realizar una donación, ofrecer tus habilidades como voluntario, organizar
        centros de acopio en tu comunidad o simplemente mantenerte informado, esta plataforma busca
        facilitar el acceso a formas seguras y confiables de apoyar a quienes han sido afectados por
        esta tragedia.
      </p>

      <h2 className="font-display font-bold text-[19px] text-[#141414] pt-2">
        ¿Por qué priorizamos organizaciones humanitarias independientes?
      </h2>
      <p>
        Muchas personas nos han preguntado por qué VEconecta prioriza organizaciones sin fines de
        lucro independientes, organizaciones humanitarias, iniciativas comunitarias y organismos
        internacionales de ayuda, en lugar de organismos directamente vinculados al gobierno
        venezolano.
      </p>
      <p>
        La respuesta se encuentra en la historia reciente del país. Durante más de dos décadas,
        Venezuela ha atravesado un proceso de deterioro democrático, denuncias de corrupción
        generalizada, debilitamiento institucional, una profunda crisis económica y una de las
        mayores crisis de desplazamiento humano del mundo. Diversos organismos internacionales,
        incluidos las Naciones Unidas, organizaciones de derechos humanos y entidades especializadas
        en transparencia, han documentado preocupaciones persistentes sobre la falta de
        transparencia, la rendición de cuentas y la politización de instituciones públicas. Estas
        circunstancias han reducido significativamente la confianza de muchos ciudadanos en la
        distribución estatal de la ayuda humanitaria.
      </p>
      <p>
        Por esta razón, numerosas organizaciones de la sociedad civil venezolana, expertos en ayuda
        humanitaria y miembros de la diáspora recomiendan canalizar las donaciones a través de
        organizaciones independientes que cuenten con mecanismos sólidos de transparencia, rendición
        de cuentas y trabajo directo con las comunidades afectadas. Estas organizaciones suelen
        colaborar con voluntarios locales, aliados internacionales y líderes comunitarios para
        procurar que la ayuda llegue de forma directa a quienes más la necesitan.
      </p>
      <p>
        VEconecta no respalda a ningún partido político ni movimiento ideológico. Nuestra misión es
        exclusivamente humanitaria: brindar información confiable para que cada persona pueda tomar
        decisiones informadas sobre cómo ayudar y contribuir a que la asistencia llegue a los
        venezolanos afectados por esta tragedia de la manera más eficiente, transparente y
        responsable posible.
      </p>
    </div>
  )
}

function AboutContentEn() {
  return (
    <div className="space-y-5 font-sans font-light text-[15px] text-[#141414] leading-relaxed">
      <h2 className="font-display font-bold text-[19px] text-[#141414]">
        About the Crisis
      </h2>
      <p>
        On Wednesday, June 24, Venezuela was struck by two powerful earthquakes measuring 7.2 and
        7.5 in magnitude just seconds apart. The twin earthquakes caused catastrophic damage across
        the country&apos;s northern coast, particularly in the state of La Guaira, the city of
        Caracas, and parts of Miranda state.
      </p>
      <p>
        According to Reuters, as of Monday, July 6, the official death toll has risen to 3,535.
        The Venezuelan government says nearly 30,000 national emergency personnel and 3,281
        international rescue workers have been deployed to assist with search, rescue, and recovery
        operations. About 17,854 people have been left homeless, while an unofficial but widely
        used registry lists more than 41,000 people as still missing. (Reuters)
      </p>
      <p>
        The destruction has displaced thousands of families, overwhelmed hospitals and emergency
        services, damaged critical infrastructure, and left entire communities searching for loved
        ones beneath the rubble. While rescue operations continue, the humanitarian needs will
        extend far beyond the initial emergency. Families will require shelter, food, medical care,
        clean water, mental health support, and long-term assistance to rebuild their lives. (Reuters)
      </p>

      <p>
        We are a group of Venezuelan women in the diaspora who created this initiative following
        the June 24 earthquakes.
      </p>

      <h2 className="font-display font-bold text-[19px] text-[#141414] pt-2">
        Why VEconecta Exists
      </h2>
      <p>
        VEconecta was created to serve as a centralized hub for people outside Venezuela who want to
        help. Our goal is to connect donors, volunteers, organizations, and members of the
        Venezuelan diaspora with trusted, verified resources so assistance can reach affected
        communities as quickly and effectively as possible.
      </p>
      <p>
        Whether you wish to donate, volunteer your professional skills, organize local collection
        drives, or simply stay informed, this platform aims to make it easier to find reliable ways
        to support those impacted by the disaster.
      </p>

      <h2 className="font-display font-bold text-[19px] text-[#141414] pt-2">
        Why We Prioritize Independent Humanitarian Organizations
      </h2>
      <p>
        Many people have asked why VEconecta primarily highlights independent nonprofit
        organizations, humanitarian agencies, community organizations, and international relief
        groups rather than agencies directly affiliated with the Venezuelan government.
      </p>
      <p>
        The answer lies in Venezuela&apos;s recent history. For more than two decades, the country
        has experienced democratic backsliding, widespread corruption allegations, institutional
        weakening, economic collapse, and one of the largest displacement crises in the world.
        Numerous international organizations, including the United Nations, independent watchdogs,
        and humanitarian groups, have documented persistent concerns regarding transparency,
        accountability, and the politicization of public institutions. These conditions have
        significantly reduced public trust in state-managed aid distribution.
      </p>
      <p>
        For this reason, many Venezuelan civil society organizations, humanitarian experts, and
        members of the Venezuelan diaspora recommend supporting independent organizations with
        established records of transparency, financial accountability, and direct community
        engagement. These organizations often work alongside local volunteers, international
        partners, and affected communities to ensure that aid reaches those who need it most.
      </p>
      <p>
        VEconecta does not endorse any political movement or party. Our sole mission is
        humanitarian: to help people make informed decisions about where and how to contribute so
        that assistance reaches Venezuelans affected by this tragedy as efficiently, transparently,
        and responsibly as possible.
      </p>
    </div>
  )
}
