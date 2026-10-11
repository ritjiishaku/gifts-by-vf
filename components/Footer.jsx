import { WaCta } from "./WaCta";

export function Footer({ text, settings }) {
  return (
    <footer>
      <div className="footer-cta">
        <h2>Ready to order?</h2>
        <p>
          Tell us what you have in mind and we&apos;ll help you craft a gift that
          feels personal.
        </p>
        <WaCta
          settings={settings}
          id="footer-wa"
          className="product-order-btn footer-cta-btn"
          label="Chat with us on WhatsApp"
          ariaLabel="Chat with us on WhatsApp"
        />
      </div>
      <p id="footer-text">{text}</p>
    </footer>
  );
}