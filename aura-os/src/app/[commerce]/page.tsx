import { notFound } from 'next/navigation';
import { food } from '@/verticals/food';

/* Page publique d'un commerce. C'est elle que scanne le client devant le
   camion : rendue côté serveur, sans JavaScript nécessaire pour lire
   l'essentiel, et conçue pour un pouce.

   Lot 1 : la structure et le vertical sont câblés ; la lecture en base arrive
   au lot 2. On ne rend donc rien plutôt que d'inventer un commerce. */

export default async function PagePublique(
  { params }: { params: Promise<{ commerce: string }> }
) {
  const { commerce } = await params;
  if (!/^[a-z0-9-]{2,64}$/.test(commerce)) notFound();

  const actions = food.actionsPubliques;
  const libelles: Record<string, string> = {
    menu: 'Voir la carte',
    booking: food.mots.reserver,
    whatsapp: 'Écrire sur WhatsApp',
    avis: 'Laisser un avis'
  };

  return (
    <main className="enveloppe" style={{ paddingBlock: '2rem' }}>
      <h1 style={{ fontSize: 'clamp(1.7rem,6vw,2.4rem)' }}>{commerce}</h1>
      <p style={{ color: 'var(--estompe)' }}>
        Page publique — structure du lot 1. Les données réelles arrivent au lot 2.
      </p>

      {/* Les appels à l'action, dans l'ordre défini par le vertical : c'est le
          vertical qui décide de ce qui compte pour un métier, pas la page. */}
      <nav aria-label="Actions" style={{ display: 'grid', gap: '.6rem', marginTop: '1.5rem' }}>
        {actions.map(a => (
          <span key={a} className="bouton bouton--fantome"
                style={{ width: '100%', justifyContent: 'space-between' }}>
            {libelles[a]} <span aria-hidden="true">→</span>
          </span>
        ))}
      </nav>
    </main>
  );
}
