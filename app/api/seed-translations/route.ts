import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// DELETE THIS FILE AFTER USE
// GET /api/seed-translations
export async function GET() {
  const translations: Array<{ name: string; nameEn: string; namePt: string }> = [
    // GLOBAL
    { name: 'Venezuela Te Busca',                                          nameEn: 'Venezuela Te Busca',                                              namePt: 'Venezuela Te Busca' },
    { name: 'Desaparecidos Terremoto Venezuela',                           nameEn: 'Venezuela Earthquake Missing Persons',                            namePt: 'Desaparecidos Terremoto Venezuela' },
    { name: 'Terremoto Venezuela — mapa colaborativo de daños',            nameEn: 'Venezuela Earthquake — Collaborative Damage Map',                 namePt: 'Terremoto Venezuela — Mapa Colaborativo de Danos' },
    { name: 'Venezuela Reporta — buscador unificado de desaparecidos',     nameEn: 'Venezuela Reporta — Unified Missing Persons Search',              namePt: 'Venezuela Reporta — Buscador Unificado de Desaparecidos' },
    { name: 'UNICEF — Fondo Emergencia Venezuela',                         nameEn: 'UNICEF — Venezuela Emergency Fund',                               namePt: 'UNICEF — Fundo Emergência Venezuela' },
    { name: 'Cáritas Internationalis — Venezuela',                         nameEn: 'Caritas Internationalis — Venezuela',                             namePt: 'Cáritas Internationalis — Venezuela' },
    { name: 'International Rescue Committee (IRC)',                        nameEn: 'International Rescue Committee (IRC)',                            namePt: 'International Rescue Committee (IRC)' },
    { name: 'GlobalGiving — Venezuela Earthquake Relief Fund',             nameEn: 'GlobalGiving — Venezuela Earthquake Relief Fund',                 namePt: 'GlobalGiving — Fundo de Alívio Terremoto Venezuela' },
    { name: 'Direct Relief — Venezuela',                                   nameEn: 'Direct Relief — Venezuela',                                       namePt: 'Direct Relief — Venezuela' },
    { name: 'World Central Kitchen — Venezuela',                           nameEn: 'World Central Kitchen — Venezuela',                               namePt: 'World Central Kitchen — Venezuela' },
    { name: 'PsicoLínea Venezuela (apoyo desde exterior)',                 nameEn: 'PsicoLínea Venezuela (Support from Abroad)',                      namePt: 'PsicoLínea Venezuela (Apoio do Exterior)' },
    { name: 'Ayuda por Venezuela — directorio de centros de acopio',       nameEn: 'Ayuda por Venezuela — Collection Center Directory',               namePt: 'Ajuda pela Venezuela — Diretório de Centros de Coleta' },
    { name: 'Venezuela Resiste — mapa de acopios y refugios',              nameEn: 'Venezuela Resiste — Supply Centers & Shelters Map',               namePt: 'Venezuela Resiste — Mapa de Coleta e Abrigos' },
    // SPAIN
    { name: 'Movistar / O2 — llamadas y SMS gratis a Venezuela',          nameEn: 'Movistar / O2 — Free Calls & SMS to Venezuela',                   namePt: 'Movistar / O2 — Chamadas e SMS Grátis para a Venezuela' },
    { name: 'MasOrange — llamadas, SMS y roaming gratis a Venezuela',     nameEn: 'MasOrange — Free Calls, SMS & Roaming to Venezuela',              namePt: 'MasOrange — Chamadas, SMS e Roaming Grátis para a Venezuela' },
    { name: 'Cáritas Española — Bizum Venezuela',                         nameEn: 'Caritas Spain — Bizum Venezuela',                                 namePt: 'Cáritas Espanhola — Bizum Venezuela' },
    { name: 'World Central Kitchen — Bizum',                              nameEn: 'World Central Kitchen — Bizum',                                   namePt: 'World Central Kitchen — Bizum' },
    { name: 'I Love Venezuela Foundation — GoFundMe',                     nameEn: 'I Love Venezuela Foundation — GoFundMe',                          namePt: 'I Love Venezuela Foundation — GoFundMe' },
    { name: 'Save the Children España — Venezuela',                       nameEn: 'Save the Children Spain — Venezuela',                             namePt: 'Save the Children Espanha — Venezuela' },
    { name: 'Médicos Sin Fronteras — Fondo de Emergencias Venezuela',     nameEn: 'Médicos Sin Fronteras — Venezuela Emergency Fund',                namePt: 'Médicos Sem Fronteiras — Fundo de Emergência Venezuela' },
    { name: 'Fundación Chamos España — emergencia Venezuela',             nameEn: 'Fundación Chamos Spain — Venezuela Emergency',                    namePt: 'Fundação Chamos Espanha — Emergência Venezuela' },
    { name: 'Madrid — Refugiados Sin Fronteras / Diáspora en Movimiento', nameEn: 'Madrid — Refugees Without Borders / Diaspora in Motion',          namePt: 'Madrid — Refugiados Sem Fronteiras / Diáspora em Movimento' },
    { name: 'Teléfono de la Esperanza',                                   nameEn: 'Teléfono de la Esperanza (Hope Hotline)',                          namePt: 'Telefone da Esperança' },
    // USA
    { name: 'Global Empowerment Mission (GEM)',                           nameEn: 'Global Empowerment Mission (GEM)',                                namePt: 'Global Empowerment Mission (GEM)' },
    { name: 'VACC Foundation — Cámara Venezolana-Americana',              nameEn: 'VACC Foundation — Venezuelan-American Chamber',                   namePt: 'VACC Foundation — Câmara Venezuelana-Americana' },
    { name: 'Miami — GEM Doral (centro principal)',                        nameEn: 'Miami — GEM Doral (Main Center)',                                 namePt: 'Miami — GEM Doral (Centro Principal)' },
    { name: 'Miami — All Star Training Center',                            nameEn: 'Miami — All Star Training Center',                                namePt: 'Miami — All Star Training Center' },
    { name: 'Miami — Nu Stadium (Inter Miami CF + GEM)',                  nameEn: 'Miami — Nu Stadium (Inter Miami CF + GEM)',                       namePt: 'Miami — Nu Stadium (Inter Miami CF + GEM)' },
    { name: "Children's Bereavement Center / Lift from Loss",             nameEn: "Children's Bereavement Center / Lift from Loss",                  namePt: 'Centro de Luto Infantil / Lift from Loss' },
    // COLOMBIA
    { name: 'Corporación Presentes',                                       nameEn: 'Corporación Presentes',                                           namePt: 'Corporação Presentes' },
    { name: 'Bancos de Alimentos Colombia (Abaco)',                        nameEn: 'Colombia Food Banks (Abaco)',                                     namePt: 'Bancos de Alimentos da Colômbia (Abaco)' },
    { name: 'Catholic Relief Services (CRS) — Venezuela',                 nameEn: 'Catholic Relief Services (CRS) — Venezuela',                     namePt: 'Catholic Relief Services (CRS) — Venezuela' },
    { name: 'Bogotá — Fundación Juntos se Puede (Chapinero 1)',           nameEn: 'Bogotá — Fundación Juntos se Puede (Chapinero 1)',                namePt: 'Bogotá — Fundação Juntos se Puede (Chapinero 1)' },
    { name: 'Bogotá — Fundación Juntos se Puede (Chapinero 2)',           nameEn: 'Bogotá — Fundación Juntos se Puede (Chapinero 2)',                namePt: 'Bogotá — Fundação Juntos se Puede (Chapinero 2)' },
    { name: 'Bogotá — Calle 104 Pasadena (Suba)',                         nameEn: 'Bogotá — Calle 104 Pasadena (Suba)',                             namePt: 'Bogotá — Calle 104 Pasadena (Suba)' },
    { name: 'Barranquilla — Alcaldía (Barranquillita)',                   nameEn: 'Barranquilla — City Hall (Barranquillita)',                       namePt: 'Barranquilla — Prefeitura (Barranquillita)' },
    { name: 'Medellín — Laika Arkadia',                                   nameEn: 'Medellín — Laika Arkadia',                                       namePt: 'Medellín — Laika Arkadia' },
    { name: 'Santa Marta — Parque La Tenería',                            nameEn: 'Santa Marta — Parque La Tenería',                                namePt: 'Santa Marta — Parque La Tenería' },
    { name: 'Centro de Acopio Bucaramanga',                               nameEn: 'Bucaramanga Collection Center',                                   namePt: 'Centro de Coleta Bucaramanga' },
    { name: 'Centro Intégrate Cartagena',                                  nameEn: 'Intégrate Center Cartagena',                                     namePt: 'Centro Intégrate Cartagena' },
    { name: 'Medellín — I.E. Héctor Abad Gómez (Placita de Flores)',      nameEn: 'Medellín — I.E. Héctor Abad Gómez (Placita de Flores)',          namePt: 'Medellín — I.E. Héctor Abad Gómez (Placita de Flores)' },
    { name: 'Centro Intégrate Medellín',                                   nameEn: 'Intégrate Center Medellín',                                      namePt: 'Centro Intégrate Medellín' },
    { name: 'Línea 106 — Salud Mental Colombia',                          nameEn: 'Line 106 — Colombia Mental Health',                               namePt: 'Linha 106 — Saúde Mental Colômbia' },
    // ARGENTINA
    { name: 'Cancillería Argentina — argentinos en Venezuela',             nameEn: 'Argentine Ministry of Foreign Affairs — Argentines in Venezuela', namePt: 'Chancelaria Argentina — argentinos na Venezuela' },
    { name: 'ACNUR — donación internacional',                             nameEn: 'UNHCR — International Donation',                                  namePt: 'ACNUR — Doação Internacional' },
    { name: 'Buenos Aires — Casa Venezuela Arg',                          nameEn: 'Buenos Aires — Casa Venezuela Argentina',                         namePt: 'Buenos Aires — Casa Venezuela Argentina' },
    { name: 'Hipólita — Palermo',                                         nameEn: 'Hipólita — Palermo',                                             namePt: 'Hipólita — Palermo' },
    { name: 'Artigiani — Colegiales',                                     nameEn: 'Artigiani — Colegiales',                                         namePt: 'Artigiani — Colegiales' },
    { name: 'Prados Café — Colegiales',                                   nameEn: 'Prados Café — Colegiales',                                       namePt: 'Prados Café — Colegiales' },
    { name: 'Vanshelato — Coghlan y Villa Pueyrredón',                   nameEn: 'Vanshelato — Coghlan & Villa Pueyrredón',                        namePt: 'Vanshelato — Coghlan e Villa Pueyrredón' },
    { name: 'AASM — apoyo psicológico gratuito venezolanos',              nameEn: 'AASM — Free Psychological Support for Venezuelans',               namePt: 'AASM — Apoio Psicológico Gratuito para Venezuelanos' },
    // MEXICO
    { name: 'CDMX — Brigada Topos Tlatelolco (Iztapalapa)',              nameEn: 'CDMX — Brigada Topos Tlatelolco (Iztapalapa)',                    namePt: 'CDMX — Brigada Topos Tlatelolco (Iztapalapa)' },
    { name: 'CDMX — Pasticho Express (Parques Polanco)',                  nameEn: 'CDMX — Pasticho Express (Parques Polanco)',                       namePt: 'CDMX — Pasticho Express (Parques Polanco)' },
    // ECUADOR
    { name: 'Quito — IMPAQTO La Carolina',                               nameEn: 'Quito — IMPAQTO La Carolina',                                    namePt: 'Quito — IMPAQTO La Carolina' },
    { name: 'Quito — Cachapas El Félix',                                  nameEn: 'Quito — Cachapas El Félix',                                      namePt: 'Quito — Cachapas El Félix' },
    { name: 'Guayaquil — Comando con Venezuela (Urdesa)',                 nameEn: 'Guayaquil — Comando con Venezuela (Urdesa)',                      namePt: 'Guayaquil — Comando con Venezuela (Urdesa)' },
    // PERU
    { name: 'Lima — Embajada de Venezuela (exteriores)',                  nameEn: 'Lima — Venezuelan Embassy (Exterior)',                            namePt: 'Lima — Embaixada da Venezuela (Exterior)' },
    { name: 'Lima — Parque Voces por el Clima',                          nameEn: 'Lima — Parque Voces por el Clima',                                namePt: 'Lima — Parque Voces por el Clima' },
    // CHILE
    { name: 'Desaparecidos Terremoto Venezuela — desde Chile',            nameEn: 'Venezuela Earthquake Missing Persons — from Chile',               namePt: 'Desaparecidos Terremoto Venezuela — do Chile' },
    { name: 'Cáritas Venezuela — donación desde Chile',                   nameEn: 'Caritas Venezuela — Donation from Chile',                         namePt: 'Cáritas Venezuela — Doação do Chile' },
    { name: 'ACNUR — donación desde Chile',                              nameEn: 'UNHCR — Donation from Chile',                                     namePt: 'ACNUR — Doação do Chile' },
    { name: 'Santiago — Centro de Acopio Municipal Independencia',        nameEn: 'Santiago — Independencia Municipal Collection Center',            namePt: 'Santiago — Centro de Coleta Municipal Independencia' },
    { name: 'Temuco — Las Mil Bendiciones',                               nameEn: 'Temuco — Las Mil Bendiciones',                                   namePt: 'Temuco — Las Mil Bendiciones' },
    { name: 'Temuco — Venemarket',                                        nameEn: 'Temuco — Venemarket',                                            namePt: 'Temuco — Venemarket' },
    { name: 'Temuco — Sabe Venezuela',                                    nameEn: 'Temuco — Sabe Venezuela',                                        namePt: 'Temuco — Sabe Venezuela' },
    { name: 'Calama — AJ Dorada Restaurant',                             nameEn: 'Calama — AJ Dorada Restaurant',                                  namePt: 'Calama — AJ Dorada Restaurant' },
    { name: 'Calama — Llanero Carnes al Barril',                         nameEn: 'Calama — Llanero Carnes al Barril',                              namePt: 'Calama — Llanero Carnes al Barril' },
    { name: 'Calama — Redlogistic Market',                               nameEn: 'Calama — Redlogistic Market',                                    namePt: 'Calama — Redlogistic Market' },
    // BRAZIL
    { name: 'Venezuela Te Busca — Brasil',                               nameEn: 'Venezuela Te Busca — Brazil',                                    namePt: 'Venezuela Te Busca — Brasil' },
    { name: 'ACNUR Brasil — emergência Venezuela',                        nameEn: 'UNHCR Brazil — Venezuela Emergency',                             namePt: 'ACNUR Brasil — Emergência Venezuela' },
    { name: 'UNICEF Brasil — emergência Venezuela',                       nameEn: 'UNICEF Brazil — Venezuela Emergency',                            namePt: 'UNICEF Brasil — Emergência Venezuela' },
  ]

  const results = await prisma.$transaction(
    translations.map(({ name, nameEn, namePt }) =>
      prisma.resource.updateMany({
        where: { name, nameEn: null },
        data: { nameEn, namePt },
      })
    )
  )

  const updated = results.reduce((sum, r) => sum + r.count, 0)
  return NextResponse.json({ ok: true, updated, total: translations.length })
}
