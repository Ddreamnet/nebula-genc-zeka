/**
 * What the student sees between pressing "Playground" and the page arriving.
 *
 * A dynamic route has nothing to prefetch but this boundary, so this is the
 * whole difference between "the click did something" and a frozen panel for
 * however long the session check takes. It draws the real silhouette — bar,
 * stage, cards, composer — in the real colours, so the page that replaces it
 * lands on top without a jump.
 */
export default function PlaygroundLoading() {
  return (
    <div className="pg-shell" aria-busy aria-label="Playground yükleniyor">
      <div className="pg-bar" />
      <div className="pg-body">
        <div className="pg-stage pn-card animate-pulse" style={{ background: "var(--color-surface-low)" }} />
        <div className="pg-cards grid grid-cols-3 gap-3">
          <div className="pn-card h-16 animate-pulse" />
          <div className="pn-card h-16 animate-pulse" />
          <div className="pn-card h-16 animate-pulse" />
        </div>
        <div className="pg-composer pn-card h-36 animate-pulse" />
      </div>
    </div>
  );
}
