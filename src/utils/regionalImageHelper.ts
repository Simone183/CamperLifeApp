export function getRealRegionalImage(locationOrTitle: string, fallbackType: 'montagna' | 'mare' | 'lago' | 'borgo' | 'toscana' = 'borgo'): string {
  const text = (locationOrTitle || '').toLowerCase();

  // Dolomiti & Val Gardena & Ortisei & Alto Adige & Trentino
  if (
    text.includes('gardena') ||
    text.includes('ortisei') ||
    text.includes('seceda') ||
    text.includes('siusi') ||
    text.includes('dolomiti') ||
    text.includes('falzarego') ||
    text.includes('tre cime') ||
    text.includes('misurina') ||
    text.includes('cortina') ||
    text.includes('badia') ||
    text.includes('alta badia') ||
    text.includes('alto adige') ||
    text.includes('suedtirol') ||
    text.includes('pusteria') ||
    text.includes('stelvio')
  ) {
    if (text.includes('misurina') || text.includes('tre cime')) return 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80';
    if (text.includes('falzarego') || text.includes('lagazuoi')) return 'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?auto=format&fit=crop&w=1200&q=80';
    if (text.includes('cortina')) return 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=1200&q=80';
    return 'https://images.unsplash.com/photo-1502784444187-359ac186c5bb?auto=format&fit=crop&w=1200&q=80'; // Seceda / Val Gardena Dolomites
  }

  // Toscana & Chianti & Val d'Orcia & Siena & Pienza & Montepulciano
  if (
    text.includes('chianti') ||
    text.includes('greve') ||
    text.includes('radda') ||
    text.includes('toscana') ||
    text.includes('val d\'orcia') ||
    text.includes('orcia') ||
    text.includes('san quirico') ||
    text.includes('pienza') ||
    text.includes('montepulciano') ||
    text.includes('siena') ||
    text.includes('monteriggioni') ||
    text.includes('volterra') ||
    text.includes('san gimignano')
  ) {
    if (text.includes('siena') || text.includes('monteriggioni')) return 'https://images.unsplash.com/photo-1528164344705-47542687990d?auto=format&fit=crop&w=1200&q=80'; // Siena Piazza del Campo
    if (text.includes('val d\'orcia') || text.includes('san quirico') || text.includes('vitaleta') || text.includes('cipressi')) return 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80'; // Val d'Orcia cypress
    if (text.includes('pienza') || text.includes('montepulciano')) return 'https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?auto=format&fit=crop&w=1200&q=80'; // Pienza hilltop village
    return 'https://images.unsplash.com/photo-1541370976299-4d24ebbc9077?auto=format&fit=crop&w=1200&q=80'; // Chianti vineyard hills
  }

  // Maremma & Saturnia & Pitigliano & Capalbio
  if (
    text.includes('saturnia') ||
    text.includes('terme') ||
    text.includes('pitigliano') ||
    text.includes('sorano') ||
    text.includes('maremma') ||
    text.includes('capalbio')
  ) {
    if (text.includes('pitigliano') || text.includes('sorano') || text.includes('tufo')) return 'https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?auto=format&fit=crop&w=1200&q=80';
    return 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80'; // Saturnia Cascate
  }

  // Calabria & Tropea & Scilla & Capo Vaticano & Pizzo
  if (
    text.includes('tropea') ||
    text.includes('calabria') ||
    text.includes('pizzo') ||
    text.includes('capo vaticano') ||
    text.includes('scilla') ||
    text.includes('chianalea') ||
    text.includes('palmi') ||
    text.includes('costa degli dei')
  ) {
    if (text.includes('tropea') || text.includes('pizzo')) return 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=1200&q=80'; // Tropea cliff town
    if (text.includes('capo vaticano') || text.includes('nicotera')) return 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1200&q=80';
    if (text.includes('scilla') || text.includes('chianalea')) return 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80'; // Scilla / Southern coast village
    return 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=1200&q=80';
  }

  // Laghi Lombardi & Nord Italia (Como, Iseo, Garda, Maggiore, Idro)
  if (
    text.includes('como') ||
    text.includes('bellagio') ||
    text.includes('varenna') ||
    text.includes('iseo') ||
    text.includes('garda') ||
    text.includes('riva del garda') ||
    text.includes('idro') ||
    text.includes('maggiore') ||
    text.includes('lago')
  ) {
    if (text.includes('como') || text.includes('bellagio')) return 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=80'; // Lake Como villa
    return 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80';
  }

  // Valle d'Aosta & Alpi Occidentali
  if (
    text.includes('aosta') ||
    text.includes('bard') ||
    text.includes('fénis') ||
    text.includes('cogne') ||
    text.includes('gran paradiso') ||
    text.includes('cervinia') ||
    text.includes('courmayeur') ||
    text.includes('monte bianco')
  ) {
    return 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80'; // Alpine valley & peaks
  }

  // Puglia
  if (
    text.includes('puglia') ||
    text.includes('alberobello') ||
    text.includes('polignano') ||
    text.includes('ostuni') ||
    text.includes('salento') ||
    text.includes('trulli') ||
    text.includes('gargano') ||
    text.includes('vieste')
  ) {
    if (text.includes('polignano') || text.includes('monopoli')) return 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80';
    return 'https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?auto=format&fit=crop&w=1200&q=80';
  }

  // Liguria
  if (
    text.includes('liguria') ||
    text.includes('cinque terre') ||
    text.includes('sanremo') ||
    text.includes('finale ligure') ||
    text.includes('portofino') ||
    text.includes('cervo') ||
    text.includes('noli')
  ) {
    return 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1200&q=80'; // Cinque Terre coastal cliff village
  }

  // Sicilia
  if (
    text.includes('sicilia') ||
    text.includes('taormina') ||
    text.includes('etna') ||
    text.includes('cefalù') ||
    text.includes('san vito') ||
    text.includes('siracusa') ||
    text.includes('agrigento') ||
    text.includes('noto')
  ) {
    return 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80';
  }

  // Sardegna
  if (
    text.includes('sardegna') ||
    text.includes('orrosei') ||
    text.includes('stintino') ||
    text.includes('cagliari') ||
    text.includes('alghero') ||
    text.includes('villasimius') ||
    text.includes('maddalena')
  ) {
    return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80';
  }

  // Umbria
  if (
    text.includes('umbria') ||
    text.includes('assisi') ||
    text.includes('trasimeno') ||
    text.includes('spello') ||
    text.includes('marmore') ||
    text.includes('orvieto') ||
    text.includes('norcia') ||
    text.includes('perugia')
  ) {
    return 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80';
  }

  // General fallback by landscape type
  if (text.includes('montagna') || text.includes('alpi') || text.includes('passo') || fallbackType === 'montagna') {
    return 'https://images.unsplash.com/photo-1502784444187-359ac186c5bb?auto=format&fit=crop&w=1200&q=80';
  }
  if (text.includes('mare') || text.includes('spiaggia') || text.includes('costa') || fallbackType === 'mare') {
    return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80';
  }
  if (text.includes('lago') || fallbackType === 'lago') {
    return 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=80';
  }

  return 'https://images.unsplash.com/photo-1541370976299-4d24ebbc9077?auto=format&fit=crop&w=1200&q=80'; // Default Tuscan countryside
}
