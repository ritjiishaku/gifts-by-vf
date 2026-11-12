export function Section({ id, className = "", children }) {
  return (
    <section id={id} className={className}>
      <div className="section-inner">{children}</div>
    </section>
  );
}
