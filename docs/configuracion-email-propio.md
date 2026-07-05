# Configuración de email propio (contacto@veconecta.org)

Esto es trabajo fuera del alcance de Claude Code: requiere acceso al panel de tu registrador/DNS y a la consola del proveedor de correo elegido. Esta guía cubre los pasos, tú los ejecutas.

## 0. Antes de empezar: ¿dónde vive tu DNS?

1. Entra a https://www.whois.com/whois/veconecta.org y busca el campo "Registrar" para confirmar dónde compraste el dominio (Namecheap, GoDaddy, Google Domains, etc.).
2. El DNS puede vivir en el registrador o estar delegado a otro sitio (por ejemplo, si en algún momento apuntaste los nameservers a Vercel). Si `veconecta.org` está añadido como dominio en tu proyecto de Vercel (Project → Settings → Domains), es probable que Vercel gestione el DNS — en ese caso los registros de este documento se añaden desde **Vercel → Domains → veconecta.org → DNS Records** en vez del panel del registrador.
3. Si no tienes claro cuál de los dos casos aplica, respóndeme "no sé" en la próxima sesión y lo confirmamos juntos con un `dig NS veconecta.org` antes de tocar nada.

## 1. Elegir proveedor de correo

| Opción | Costo | Qué hace | Cuándo conviene |
|---|---|---|---|
| **ImprovMX** | Gratis (plan básico) | Solo reenvía correos recibidos en `contacto@veconecta.org` a tu Gmail personal; no puedes *enviar* como `contacto@` sin plan pago | Si solo necesitas recibir, no enviar, y quieres cero costo |
| **Zoho Mail** | Gratis hasta 5 usuarios (plan Forever Free) | Bandeja de entrada propia, envías y recibes como `contacto@veconecta.org`, webmail incluido | Buen equilibrio costo/funcionalidad para un proyecto pequeño |
| **Google Workspace** | De pago (~6-7 USD/usuario/mes) | Gmail completo con tu dominio, Drive, Calendar, etc. | Si ya vives en el ecosistema Google o quieres la app de Gmail tal cual |

Recomendación: si el volumen de correo es bajo, empieza con **Zoho Mail** (gratis, envío y recepción reales). Si más adelante el equipo crece, migra a Google Workspace.

## 2. Pasos según proveedor elegido

### Opción A — Zoho Mail (gratis)

1. Crea cuenta en https://www.zoho.com/mail/ → plan "Forever Free" → añade `veconecta.org` como dominio propio.
2. Zoho te da un registro **TXT de verificación de dominio**: cópialo y añádelo en tu DNS (host `@` o el que indique Zoho).
3. Espera la verificación (puede tardar minutos u horas según el TTL del DNS).
4. Zoho te da los registros **MX** a añadir (normalmente 2-3, con distinta prioridad). Bórralos únicos que ya existan apuntando a otro proveedor de correo (si los hay) para no duplicar.
5. Añade el registro **SPF** (TXT en `@`): `v=spf1 include:zoho.com ~all` (ajusta si Zoho te da uno distinto en el panel).
6. Añade **DKIM**: Zoho te da un TXT tipo `zoho._domainkey` — cópialo tal cual.
7. Crea el buzón `contacto@veconecta.org` desde el panel de Zoho.
8. Verifica enviando un correo de prueba desde `contacto@veconecta.org` a tu Gmail personal y viceversa.

### Opción B — Google Workspace (de pago)

1. Entra a https://workspace.google.com/ → "Empezar" → introduce `veconecta.org` como dominio.
2. Google te pide verificar propiedad del dominio: te da un registro **TXT** (`google-site-verification=...`) para añadir en tu DNS.
3. Una vez verificado, añade los registros **MX** que indica Google (son 1 registro `smtp.google.com` con prioridad 1 en la config moderna, o los 5 clásicos según la versión del asistente).
4. Añade **SPF**: `v=spf1 include:_spf.google.com ~all`.
5. Activa DKIM desde Admin Console → Apps → Google Workspace → Gmail → Autenticación de correo, y añade el TXT que te da.
6. Crea el usuario `contacto@veconecta.org` desde la consola de administración.
7. (Opcional pero recomendado) añade registro **DMARC** (ver sección 3).

### Opción C — ImprovMX (gratis, solo reenvío)

1. Entra a https://improvmx.com/ → añade `veconecta.org`.
2. Te da 2 registros **MX** para añadir en tu DNS.
3. Configura el alias `contacto@` → tu Gmail personal.
4. Sin plan pago no podrás *enviar* con remitente `contacto@veconecta.org`, solo recibir y que te reenvíe.

## 3. Registro DMARC (recomendado con cualquier opción, mejora entregabilidad)

Añade un TXT en el host `_dmarc.veconecta.org`:

```
v=DMARC1; p=none; rua=mailto:contacto@veconecta.org
```

`p=none` solo monitorea sin rechazar nada — es el punto de partida seguro. Puedes endurecerlo a `p=quarantine` más adelante si quieres.

## 4. Ojo con Resend (ya en uso para magic-link)

VeConecta ya usa **Resend** para enviar el magic-link de login y la suscripción por email, con su propio dominio de envío configurado (ver `RESEND_API_KEY` en `.env`). Los registros SPF/DKIM de Resend son independientes de los del buzón `contacto@` — no se pisan entre sí siempre que:

- El SPF combine ambos en un solo registro TXT si Resend también usa `include:` en el mismo host `@` (SPF no permite dos registros TXT tipo `v=spf1` separados en el mismo host; hay que fusionarlos en uno: `v=spf1 include:resend.com include:zoho.com ~all`, por ejemplo).
- Antes de añadir el SPF del proveedor de correo nuevo, revisa si ya existe un TXT `v=spf1` en `@` puesto por Resend y fusiona los `include:` en una sola línea en vez de crear un segundo registro.

## 5. Verificación final

- `dig MX veconecta.org` debe mostrar los registros del proveedor elegido.
- `dig TXT veconecta.org` debe mostrar un único registro SPF con todos los `include:` combinados.
- Enviar y recibir un correo de prueba real desde `contacto@veconecta.org`.
- Actualizar el footer/página de contacto del sitio con la nueva dirección si antes mostraba otra.
