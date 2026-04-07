export function RoundTransition(props: {
  title: string;
  subtitle: string;
}) {
  const { title, subtitle } = props;

  return (
    <div className="round-transition">
      <div className="round-transition-card">
        <p className="section-eyebrow">Match Found</p>
        <h2>{title}</h2>
        <p className="subtle">{subtitle}</p>
        <div className="transition-bars" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
