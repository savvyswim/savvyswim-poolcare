import { Link } from "@/lib/router-compat";
import Seo from "@/components/Seo";
import { trackContactClick } from "@/lib/contactTracking";

const Privacy = () => (
  <main className="min-h-screen bg-background text-foreground px-6 py-16">
    <article className="max-w-3xl mx-auto">
      <Seo
        title="Privacy Policy | Savvy Swim"
        description="How Savvy Swim (Santana & Rivera) collects, uses, and protects your personal information, including SMS opt-in consent data."
        path="/privacy"
      />
      <Link to="/" className="text-amber-brand text-sm">&larr; Back to Savvy Swim</Link>
      <h1 className="text-3xl font-bold mt-4 mb-2">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-1"><strong>Effective Date:</strong> June 23, 2026</p>
      <p className="text-sm text-muted-foreground mb-1"><strong>Last Updated:</strong> June 23, 2026</p>
      <p className="text-sm text-muted-foreground mb-1"><strong>Company:</strong> Santana &amp; Rivera, doing business as Savvy Swim ("we," "our," or "us")</p>
      <p className="text-sm text-muted-foreground mb-1">
        <strong>Website:</strong>{" "}
        <a href="https://savvyswimservices.com" className="text-amber-brand">https://savvyswimservices.com</a>
      </p>
      <p className="text-sm text-muted-foreground mb-8">
        <strong>Contact:</strong>{" "}
        <a href="mailto:hi@savvyswim.com" className="text-amber-brand">hi@savvyswim.com</a>{" "}·{" "}
        <a href="tel:+18176637665" onClick={onCallClick("privacy_body")} className="text-amber-brand">(817) 663-7665</a>
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">1. Introduction</h2>
      <p className="mb-4">
        Santana &amp; Rivera is committed to protecting your privacy. This Privacy Policy explains how we
        collect, use, disclose, and safeguard your information when you visit our website
        (https://savvyswimservices.com), submit a form, call or text us, or otherwise engage with our
        services. By using our website or services, you consent to the practices described in this
        Privacy Policy.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">2. Information We Collect</h2>
      <p className="mb-2">We collect personal information that you voluntarily provide to us, including:</p>
      <ul className="list-disc pl-6 space-y-1 mb-4">
        <li>Full name</li>
        <li>Mobile telephone number</li>
        <li>Email address</li>
        <li>Service or property address</li>
        <li>Project details, scheduling preferences, and any notes you submit</li>
        <li>SMS opt-in status, consent date/time, and the IP address or device from which consent was given</li>
      </ul>
      <p className="mb-4">
        We may also collect limited technical information automatically when you visit the site
        (such as browser type, device, pages visited, and approximate location derived from IP
        address) for security, analytics, and site-performance purposes.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">3. How We Use Your Information</h2>
      <p className="mb-2">We use the information we collect to:</p>
      <ul className="list-disc pl-6 space-y-1 mb-4">
        <li>Respond to your inquiries and requests for estimates</li>
        <li>Schedule, confirm, and remind you of appointments</li>
        <li>Provide repair, maintenance, contracting, and pool services</li>
        <li>Send you transactional communications (email, phone, and — if you opted in — SMS)</li>
        <li>Provide customer support</li>
        <li>Maintain records of consent, transactions, and communications</li>
        <li>Comply with our legal obligations and enforce our Terms</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-2">4. SMS Information Sharing &amp; Data Protection</h2>
      <p className="mb-4">
        Santana &amp; Rivera strictly respects your privacy.{" "}
        <strong>
          No mobile information, mobile phone numbers, or SMS opt-in consent data will be shared
          with any third parties or affiliates for marketing or promotional purposes.
        </strong>{" "}
        Information sharing to subcontractors is permitted solely to support and operate the
        messaging program (for example, our SMS messaging service provider) and only as necessary
        to deliver the messages you requested. All other categories of personal information may be
        shared in accordance with this Privacy Policy, but text-messaging originator opt-in data
        and consent will not be shared with any third parties whatsoever.
      </p>
      <p className="mb-4">
        SMS opt-in data is strictly used for the fulfillment of requested services, appointment
        reminders, quote follow-ups, account/service notifications, and direct customer support
        communications as requested by the user.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">5. How We Share Other Information</h2>
      <p className="mb-2">We may share non-SMS personal information only with:</p>
      <ul className="list-disc pl-6 space-y-1 mb-4">
        <li>Service providers and subcontractors who perform services on our behalf (scheduling, hosting, email delivery, payment processing) under contractual confidentiality obligations</li>
        <li>Law enforcement, regulators, or other parties when required by law, subpoena, or to protect our legal rights</li>
        <li>A successor entity in connection with a merger, acquisition, or sale of assets</li>
      </ul>
      <p className="mb-4">We do not sell your personal information.</p>

      <h2 className="text-xl font-semibold mt-8 mb-2">6. Data Retention</h2>
      <p className="mb-4">
        We retain personal information only for as long as necessary to fulfill the purposes
        described in this Privacy Policy, comply with our legal, accounting, or reporting
        obligations, and resolve disputes. SMS consent records are retained for the duration of
        your relationship with us and for a reasonable period thereafter to demonstrate compliance.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">7. Data Security</h2>
      <p className="mb-4">
        We use reasonable administrative, technical, and physical safeguards designed to protect
        the personal information we collect. While we have taken reasonable steps to secure the
        personal information you provide to us, please be aware that no security measures are
        perfect or impenetrable, and we cannot guarantee absolute security.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">8. Your Rights &amp; Choices</h2>
      <ul className="list-disc pl-6 space-y-1 mb-4">
        <li><strong>SMS opt-out:</strong> Reply STOP, CANCEL, UNSUBSCRIBE, or QUIT to any text message from us at any time.</li>
        <li><strong>Email opt-out:</strong> Use the unsubscribe link in any email, or contact us.</li>
        <li><strong>Access, correction, deletion:</strong> You may request access to, correction of, or deletion of your personal information by emailing hi@savvyswim.com.</li>
        <li><strong>Do Not Call:</strong> You may request to be added to our internal Do Not Call list.</li>
      </ul>
      <p className="mb-4">
        Residents of California, Virginia, Colorado, and other states with comprehensive privacy
        laws may have additional rights, including the right to know what personal information we
        process and the right to opt out of certain processing. To exercise these rights, contact
        us at hi@savvyswim.com.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">9. Children's Privacy</h2>
      <p className="mb-4">
        Our website and services are not directed to children under 13, and we do not knowingly
        collect personal information from children under 13. If you believe a child has provided us
        with personal information, please contact us and we will delete it.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">10. Cookies &amp; Analytics</h2>
      <p className="mb-4">
        Our website may use cookies and similar technologies to operate the site, remember
        preferences, and analyze traffic. You can control cookies through your browser settings.
        Disabling cookies may affect site functionality.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">11. Third-Party Links</h2>
      <p className="mb-4">
        Our website may contain links to third-party sites. We are not responsible for the privacy
        practices or content of those sites. We encourage you to review their privacy policies.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">12. Changes to This Privacy Policy</h2>
      <p className="mb-4">
        We may update this Privacy Policy from time to time. When we do, we will revise the "Last
        Updated" date above. Material changes will be communicated through the website or by other
        reasonable means. Your continued use of our website or services after changes take effect
        constitutes acceptance of the revised policy.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">13. Contact Us</h2>
      <p className="mb-4">
        Questions about this Privacy Policy or our data practices? Contact:
      </p>
      <p className="mb-1"><strong>Santana &amp; Rivera (dba Savvy Swim)</strong></p>
      <p className="mb-1">Email: <a href="mailto:hi@savvyswim.com" className="text-amber-brand">hi@savvyswim.com</a></p>
      <p className="mb-1">Phone: <a href="tel:+18176637665" onClick={onCallClick("privacy_body")} className="text-amber-brand">(817) 663-7665</a></p>
      <p className="mb-1">Website: <a href="https://savvyswimservices.com" className="text-amber-brand">https://savvyswimservices.com</a></p>
    </article>
  </main>
);
export default Privacy;
