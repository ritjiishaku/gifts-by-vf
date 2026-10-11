import { WaCta } from "./WaCta";

export function Footer({ text, settings }) {
  return (
    <footer>
      <div className="footer-cta">
        <h2>{settings.footer_cta_title || "Ready to order?"}</h2>
        <p>
          {settings.footer_cta_desc ||
            "Tell us what you have in mind and we'll help you craft a gift that feels personal."}
        </p>
        <WaCta
          settings={settings}
          id="footer-wa"
          className="product-order-btn footer-cta-btn"
          label={settings.footer_cta_label || "Chat with us on WhatsApp"}
          ariaLabel="Chat with us on WhatsApp"
        />
      </div>
      <p id="footer-text">{text}</p>
    </footer>
  );
}