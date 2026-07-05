# Página "Sobre" + feed de "Noticias" (Nivel 3 del plan post-lanzamiento)

**Fecha:** 2026-07-05
**Estado:** aprobado, pendiente de plan de implementación

## Problema

El plan priorizado post-lanzamiento (ver `project-veconecta.md`, análisis 2026-07-04) tiene el Nivel 3 pendiente: una página "Sobre" con metodología de verificación y contexto de la iniciativa. Al retomarlo, el usuario aclaró que necesita algo más amplio que una página estática: un feed de noticias/actualizaciones que crecerá con el tiempo, separado de la identidad fija del sitio.

El usuario aportó un documento (`About the Crisis.txt`, ES/EN) que mezcla dos tipos de contenido: hechos fechados del terremoto (propios de una noticia puntual) y la misión/metodología de VEconecta (contenido atemporal). Este spec cubre cómo separar y estructurar ambos.

## Objetivo

- `/[locale]/sobre`: página estática con la misión de VEconecta y por qué prioriza organizaciones independientes.
- `/[locale]/noticias`: feed cronológico (más reciente primero) de posts publicados por ADMIN.
- `/[locale]/noticias/[slug]`: detalle de cada post, compartible, con metadata OG.
- Primer post del feed: los hechos del terremoto del documento aportado, sin editar su contenido.
- Todo administrable desde `/admin/updates`, solo por rol `ADMIN`.

## Modelo de datos

Nuevo modelo Prisma, siguiendo el patrón ya usado por `Resource` (`cuid()`, timestamps, status con default, i18n columna-por-idioma vía `LOCALE_SUFFIX`):

```prisma
model Post {
  id          String     @id @default(cuid())
  slug        String     @unique
  title       String
  titleEn     String?
  body        String
  bodyEn      String?
  status      PostStatus @default(DRAFT)
  publishedAt DateTime?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  @@index([status])
}

enum PostStatus {
  DRAFT
  PUBLISHED
}
```

Nombre `Post` (no `Update`): Prisma ya expone `.update()` como método CRUD en cada modelo, así que un modelo llamado `Update` volvería `prisma.update.create(...)` / `prisma.update.update(...)` confuso de leer. `PostStatus` sigue la misma convención que `ResourceStatus`.

**Idiomas:** solo `title`/`titleEn` y `body`/`bodyEn` por ahora (`title`/`body` son la columna base en español, igual que `Resource.name`/`notesEs`). Añadir `titlePt/titleFr/titleDe` y `bodyPt/bodyFr/bodyDe` queda fuera de este alcance — se puede sumar después con una migración aditiva + contenido, reutilizando `localizeBare()` de `lib/locale-content.ts` sin tocar componentes (mismo mecanismo ya usado para activar alemán en `Resource`).

**`publishedAt`:** se fija automáticamente la primera vez que un post pasa a `PUBLISHED` (igual que `Resource.verifiedAt`), no editable a mano. Ordena el feed.

**Localización de contenido en las páginas públicas:** `localizeBare(post, 'title', locale)` y `localizeBare(post, 'body', locale)` — ya existen en `lib/locale-content.ts`, sin código nuevo. Para `pt`/`fr`/`de` (sin columna propia) el helper ya cae de vuelta al español.

## Rutas públicas

- `app/[locale]/sobre/page.tsx` — estática, sin queries a BD. `generateMetadata` con título/descripción fijos (ver contenido más abajo) y el OG genérico ya existente (`/api/og`, sin imagen por página).
- `app/[locale]/noticias/page.tsx` — `prisma.post.findMany({ where: { status: 'PUBLISHED' }, orderBy: { publishedAt: 'desc' } })`. Lista título + fecha (`Intl.DateTimeFormat` con `INTL_LOCALE[locale]`, mismo patrón que la fecha de actualización del home) + resumen (primeras líneas del body, truncado).
- `app/[locale]/noticias/[slug]/page.tsx` — `prisma.post.findUnique({ where: { slug } })`; 404 (`notFound()`) si no existe o `status !== 'PUBLISHED'`. `generateMetadata` dinámico con el título localizado y el OG genérico.

## Admin (`/admin/updates`, ADMIN-only)

Mismo patrón que `app/admin/(dashboard)/languages/page.tsx`: `getSession()` + `if (user.role !== 'ADMIN') redirect('/admin')`, server actions inline, `logAction`, `revalidatePath('/', 'layout')` tras cualquier cambio de estado (afecta rutas públicas).

- `app/admin/(dashboard)/updates/page.tsx` — lista todos los posts (borrador + publicado), botón "+ Nueva noticia", link editar por fila.
- `app/admin/(dashboard)/updates/new/page.tsx` — formulario: título, título EN (opcional), cuerpo (textarea), cuerpo EN (opcional), selector de estado (Borrador/Publicado, default Borrador). Al crear: `slug = slugify(title)`, con reintento de sufijo `-2`, `-3`... en colisión (mismo patrón que `resolveCityId` en `lib/city.ts`).
- `app/admin/(dashboard)/updates/[id]/page.tsx` — mismos campos + slug editable + botón eliminar (`prisma.post.delete`, sin restricción adicional — es contenido editorial, no un recurso con historial de verificación).
- Auditoría: `POST_CREATE`, `POST_EDIT`, `POST_DELETE` (convención `<ENTIDAD>_<VERBO>` ya usada por `COUNTRY_*`/`RESOURCE_*`/`USER_*`). Sin acción `POST_PUBLISH` separada — a diferencia de `Resource`, no hay botón de "publicar" independiente; el estado se cambia desde el mismo formulario de creación/edición, así que ese cambio queda registrado como `POST_CREATE`/`POST_EDIT` igual que cualquier otro campo.
- Entrada de navegación: link "Noticias" en `app/admin/(dashboard)/page.tsx`, junto a los links existentes a Países/Idiomas/Usuarios.

## `lib/slugify.ts`

Renombrar la única función exportada, `cityToSlug` → `slugify` (la implementación ya es genérica, no tiene nada específico de ciudades). Actualizar su único call site (`lib/city.ts`). El admin de posts pasa a ser el segundo caller.

## Navegación

Dos links de texto, "Sobre" y "Noticias", en `components/AppFooter.tsx`, junto al disclaimer existente. Sin cambios en `AppHeader.tsx` ni `BottomNav.tsx` (el bottom-nav móvil ya está lleno con Inicio/Buscar/Compartir).

## Contenido

### `/sobre`

El texto de "por qué existe VEconecta" y "por qué priorizamos organizaciones independientes" se mantiene **verbatim** del documento aportado por el usuario (`About the Crisis.txt`), sin reescribirlo. Se antepone una única oración nueva (no está en el documento original, es la única línea que no es del usuario) para cubrir el encuadre de "iniciativa de venezolanas" que pidió — marcada aquí explícitamente para que la ajuste o quite cuando quiera:

**Español:**

> *VEconecta es una iniciativa creada por un grupo de venezolanas en la diáspora tras los terremotos del 24 de junio.* [única línea no verbatim]
>
> ## ¿Por qué existe VEconecta?
>
> VEconecta nació con el propósito de servir como un centro de información para las personas que desean ayudar desde fuera de Venezuela. Nuestro objetivo es conectar a donantes, voluntarios, organizaciones y miembros de la diáspora venezolana con recursos confiables y verificados para que la ayuda llegue a las comunidades afectadas de la manera más rápida y efectiva posible.
>
> Ya sea que desees realizar una donación, ofrecer tus habilidades como voluntario, organizar centros de acopio en tu comunidad o simplemente mantenerte informado, esta plataforma busca facilitar el acceso a formas seguras y confiables de apoyar a quienes han sido afectados por esta tragedia.
>
> ## ¿Por qué priorizamos organizaciones humanitarias independientes?
>
> Muchas personas nos han preguntado por qué VEconecta prioriza organizaciones sin fines de lucro independientes, organizaciones humanitarias, iniciativas comunitarias y organismos internacionales de ayuda, en lugar de organismos directamente vinculados al gobierno venezolano.
>
> La respuesta se encuentra en la historia reciente del país. Durante más de dos décadas, Venezuela ha atravesado un proceso de deterioro democrático, denuncias de corrupción generalizada, debilitamiento institucional, una profunda crisis económica y una de las mayores crisis de desplazamiento humano del mundo. Diversos organismos internacionales, incluidos las Naciones Unidas, organizaciones de derechos humanos y entidades especializadas en transparencia, han documentado preocupaciones persistentes sobre la falta de transparencia, la rendición de cuentas y la politización de instituciones públicas. Estas circunstancias han reducido significativamente la confianza de muchos ciudadanos en la distribución estatal de la ayuda humanitaria.
>
> Por esta razón, numerosas organizaciones de la sociedad civil venezolana, expertos en ayuda humanitaria y miembros de la diáspora recomiendan canalizar las donaciones a través de organizaciones independientes que cuenten con mecanismos sólidos de transparencia, rendición de cuentas y trabajo directo con las comunidades afectadas. Estas organizaciones suelen colaborar con voluntarios locales, aliados internacionales y líderes comunitarios para procurar que la ayuda llegue de forma directa a quienes más la necesitan.
>
> VEconecta no respalda a ningún partido político ni movimiento ideológico. Nuestra misión es exclusivamente humanitaria: brindar información confiable para que cada persona pueda tomar decisiones informadas sobre cómo ayudar y contribuir a que la asistencia llegue a los venezolanos afectados por esta tragedia de la manera más eficiente, transparente y responsable posible.

**English:**

> *VEconecta is an initiative created by a group of Venezuelan women in the diaspora following the June 24 earthquakes.* [only non-verbatim line]
>
> ## Why VEconecta Exists
>
> VEconecta was created to serve as a centralized hub for people outside Venezuela who want to help. Our goal is to connect donors, volunteers, organizations, and members of the Venezuelan diaspora with trusted, verified resources so assistance can reach affected communities as quickly and effectively as possible.
>
> Whether you wish to donate, volunteer your professional skills, organize local collection drives, or simply stay informed, this platform aims to make it easier to find reliable ways to support those impacted by the disaster.
>
> ## Why We Prioritize Independent Humanitarian Organizations
>
> Many people have asked why VEconecta primarily highlights independent nonprofit organizations, humanitarian agencies, community organizations, and international relief groups rather than agencies directly affiliated with the Venezuelan government.
>
> The answer lies in Venezuela's recent history. For more than two decades, the country has experienced democratic backsliding, widespread corruption allegations, institutional weakening, economic collapse, and one of the largest displacement crises in the world. Numerous international organizations, including the United Nations, independent watchdogs, and humanitarian groups, have documented persistent concerns regarding transparency, accountability, and the politicization of public institutions. These conditions have significantly reduced public trust in state-managed aid distribution.
>
> For this reason, many Venezuelan civil society organizations, humanitarian experts, and members of the Venezuelan diaspora recommend supporting independent organizations with established records of transparency, financial accountability, and direct community engagement. These organizations often work alongside local volunteers, international partners, and affected communities to ensure that aid reaches those who need it most.
>
> VEconecta does not endorse any political movement or party. Our sole mission is humanitarian: to help people make informed decisions about where and how to contribute so that assistance reaches Venezuelans affected by this tragedy as efficiently, transparently, and responsibly as possible.

Este texto se guarda como copy estático directo en `app/[locale]/sobre/page.tsx` (rama `locale === 'en' ? ... : ...`, mismo patrón que `generateMetadata` en `app/[locale]/page.tsx`), no en `messages/*.json` — es contenido largo de una sola página, no strings de UI reutilizables.

### Primer post de `/noticias`

Seed vía migración de datos o script one-off (mismo criterio que el registro manual de recursos globales en alemán): un `Post` con:

- `slug`: `sobre-la-crisis`
- `title`: `Sobre la crisis`
- `titleEn`: `About the Crisis`
- `body`/`bodyEn`: el texto de "Sobre la crisis"/"About the Crisis" del documento aportado, **verbatim, sin editar** (los tres párrafos de hechos: los sismos, cifras de Reuters al 4 de julio, y el impacto humanitario).
- `status`: `PUBLISHED`, `publishedAt`: fecha de publicación real (hoy, 2026-07-05).

## Fuera de alcance

- Traducción de `/sobre` y del feed a pt/fr/de (columnas ya preparadas para sumarlo después).
- Imagen de portada por post — se reutiliza el OG genérico existente.
- Reordenar o "fijar" posts — el feed es estrictamente cronológico por `publishedAt`.
- Cualquier acción de EDITOR sobre posts — es contenido ADMIN-only.

## Testing

Sin suite automatizada para el admin (igual que el resto de `/admin`), verificación manual:

1. `tsc --noEmit` limpio tras migración + código nuevo.
2. Crear un post en borrador desde `/admin/updates/new` → no aparece en `/noticias` público.
3. Publicarlo → aparece en `/noticias` (locale es/en) y su página de detalle carga con el slug correcto.
4. Slug duplicado al crear dos posts con el mismo título → el segundo recibe sufijo `-2` sin error.
5. `/sobre` carga en es/en con el contenido verbatim; en pt/fr/de por ahora también carga (mismo copy estático, ver "Fuera de alcance").
6. Post con `status = DRAFT` visitado directamente en `/noticias/[slug]` → 404.
7. Footer muestra los links "Sobre"/"Noticias" y navegan a las rutas correctas.
