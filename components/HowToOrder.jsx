import { WaCta } from "./WaCta";

export function HowToOrder({ label, title, rows, defaults, settings }) {
  const steps = rows && rows.length ? rows : defaults || [];

  return (
    <section id="how-to-order" className="side-section fade-in">
      <div className="section-inner">
        <div className="catalogue-header">
          <p className="section-label" id="howto-label">{label}</p>
          <h2 className="section-title" id="howto-title">{title}</h2>
        </div>

        <div className="howto-intro fade-in">
          <p className="howto-kicker">Easy gifting flow</p>
          <p className="howto-summary">Choose a gift, share the details, and we&apos;ll make the rest simple.</p>
        </div>

        <div className="howto-badges fade-in" aria-label="How the ordering process works">
          <span>Pick your gift</span>
          <span>Share your details</span>
          <span>Approve &amp; order</span>
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
          <p>
            Tell us what you&apos;re looking for and we&apos;ll help you pick a meaningful gift
            that feels personal.
          </p>
          <WaCta
            settings={settings}
            id="howto-wa"
            className="product-order-btn"
            label="Start your order"
            ariaLabel="Start your order on WhatsApp"
          />
        </div>
      </div>
    </section>
  );
}
