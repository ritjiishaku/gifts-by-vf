import { WaCta } from "./WaCta";

export function HowToOrder({ label, title, rows, defaults, settings }) {
  const steps = rows && rows.length ? rows : defaults || [];
  const badges = String(settings.howto_badges || "")
    .split("\n")
    .map((b) => b.trim())
    .filter(Boolean);
  const kicker = settings.howto_kicker || "Easy gifting flow";
  const summary =
    settings.howto_summary ||
    "Choose a gift, share the details, and we'll make the rest simple.";
  const ctaText =
    settings.howto_cta_text ||
    "Tell us what you're looking for and we'll help you pick a meaningful gift that feels personal.";
  const ctaLabel = settings.howto_cta_label || "Start your order";

  return (
    <section id="how-to-order" className="side-section fade-in">
      <div className="section-inner">
        <div className="catalogue-header">
          <p className="section-label" id="howto-label">{label}</p>
          <h2 className="section-title" id="howto-title">{title}</h2>
        </div>

        <div className="howto-intro fade-in">
          <p className="howto-kicker">{kicker}</p>
          <p className="howto-summary">{summary}</p>
        </div>

        <div className="howto-badges fade-in" aria-label="How the ordering process works">
          {badges.map((badge) => (
            <span key={badge}>{badge}</span>
          ))}
        </div>

        <ol className="steps fade-in" id="howto-grid">
          {steps.map((step, i) => (
            <li key={step.id || i} className="step">
              <span className="step-num">{i + 1}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="steps-cta fade-in">
          <p>{ctaText}</p>
          <WaCta
            settings={settings}
            id="howto-wa"
            className="product-order-btn"
            label={ctaLabel}
            ariaLabel="Start your order on WhatsApp"
          />
        </div>
      </div>
    </section>
  );
}
