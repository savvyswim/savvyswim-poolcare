import { Link } from "react-router-dom";
import Seo from "@/components/Seo";
import { trackContactClick } from "@/lib/contactTracking";

const Terms = () => (
  <main className="min-h-screen bg-background text-foreground px-6 py-16">
    <article className="max-w-3xl mx-auto">
      <Seo
        title="Terms & Conditions | Savvy Swim"
        description="Terms and conditions for Savvy Swim pool cleaning, service, and repair, including SMS program and payment terms."
        path="/terms"
      />
      <Link to="/" className="text-amber-brand text-sm">&larr; Back to Savvy Swim</Link>
      <h1 className="text-3xl font-bold mt-4 mb-2">Terms and Conditions</h1>
      <p className="text-sm text-muted-foreground mb-1"><strong>Effective Date:</strong> June 23, 2026</p>
      <p className="text-sm text-muted-foreground mb-1"><strong>Last Updated:</strong> June 23, 2026</p>
      <p className="text-sm text-muted-foreground mb-1"><strong>Company:</strong> Santana &amp; Rivera, doing business as Savvy Swim</p>
      <p className="text-sm text-muted-foreground mb-1">
        <strong>Website:</strong>{" "}
        <a href="https://savvyswim.com" className="text-amber-brand">https://savvyswim.com</a>
      </p>
      <p className="text-sm text-muted-foreground mb-8">
        <strong>Contact:</strong>{" "}
        <a href="mailto:hi@savagepools.us" className="text-amber-brand">hi@savagepools.us</a>{" "}·{" "}
        <a href="tel:+14697440379" onClick={() => trackContactClick("call_click", "terms_body")} className="text-amber-brand">(469) 744-0379</a>
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">1. Acceptance of Terms</h2>
      <p className="mb-4">
        By accessing our website (https://savvyswim.com) or utilizing the services provided by
        Santana &amp; Rivera ("we," "our," or "us"), you ("you" or "Customer") agree to be bound by these
        Terms and Conditions ("Terms") and our{" "}
        <Link to="/privacy-policy" className="text-amber-brand">Privacy Policy</Link>. If you do not
        agree with any part of these Terms, you must not use our website or services.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">2. Services Provided</h2>
      <p className="mb-4">
        Santana &amp; Rivera provides pool cleaning, maintenance, service, and repair.
        All estimates provided are non-binding and subject to change based on the physical scope of
        work determined upon on-site inspection, market pricing of materials, and site conditions.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">3. SMS Text Messaging Terms (10DLC Program Disclosure)</h2>
      <p className="mb-4">
        By opting into our SMS communications via our website form, in-person paper intake form, or
        by texting us first, you agree to the following terms regarding text messaging. This
        section is also our messaging program disclosure for carrier and 10DLC compliance.
      </p>

      <ul className="space-y-3 mb-4 list-disc pl-6">
        <li>
          <strong>Program Name / Brand:</strong> Savvy Swim (operated by Santana &amp; Rivera).
        </li>
        <li>
          <strong>Program Description / Use Case:</strong> Customer Care and Account Notifications.
          Text messages are used to send service estimates, appointment confirmations and reminders,
          on-the-way notifications, maintenance updates, quote follow-ups, and customer support
          replies related to services you requested.
        </li>
        <li>
          <strong>How to Opt In:</strong> You opt in by (a) checking the SMS consent box on our
          website booking/contact form, (b) signing a paper intake form that includes the SMS
          consent disclosure, or (c) texting us first from your mobile device. Opt-in is never a
          condition of purchase. Consent is collected from one user at a time and is not
          transferable.
        </li>
        <li>
          <strong>Message Frequency:</strong> Message frequency varies based on your requested
          services and appointments. You will typically receive messages only in response to your
          activity (appointments, quotes, service updates).
        </li>
        <li>
          <strong>Costs:</strong> Standard message and data rates may apply depending on your
          cellular provider plan. Santana &amp; Rivera does not charge for the messages themselves.
        </li>
        <li>
          <strong>Opt-Out (STOP):</strong> You may opt out of receiving text messages at any time
          by replying <strong>STOP</strong>, CANCEL, UNSUBSCRIBE, END, or QUIT to any message you
          receive from us. After opting out, you will receive one final confirmation message and no
          further messages, unless you opt back in.
        </li>
        <li>
          <strong>Help (HELP):</strong> If you need assistance, reply <strong>HELP</strong> to any
          message and you will receive a message with our contact information, or contact us at{" "}
          <a href="mailto:hi@savagepools.us" className="text-amber-brand">hi@savagepools.us</a> or{" "}
          <a href="tel:+14697440379" onClick={() => trackContactClick("call_click", "terms_body")} className="text-amber-brand">(469) 744-0379</a>.
        </li>
        <li>
          <strong>Sample Message:</strong> "Savvy Swim: Hi Jane, this is a reminder of your pool
          inspection tomorrow at 10:00 AM. Reply STOP to opt out, HELP for help. Msg &amp; data
          rates may apply."
        </li>
        <li>
          <strong>Supported Carriers:</strong> Messaging is supported on all major U.S. carriers,
          including AT&amp;T, T-Mobile, Verizon Wireless, Sprint, Boost, U.S. Cellular, MetroPCS,
          and others. Carriers are not liable for delayed or undelivered messages.
        </li>
        <li>
          <strong>No Sharing:</strong> We will not share, sell, or trade your mobile telephone
          number or SMS consent data with any third parties or affiliates for marketing or
          promotional purposes. See our{" "}
          <Link to="/privacy-policy" className="text-amber-brand">Privacy Policy</Link> for details.
        </li>
        <li>
          <strong>Eligibility:</strong> The SMS program is available to U.S. residents who are at
          least 18 years of age (or the age of majority in their jurisdiction).
        </li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-2">4. Estimates, Payment &amp; Cancellation</h2>
      <p className="mb-4">
        All estimates are valid for the period stated on the estimate. Payment terms, deposits, and
        cancellation policies for any scheduled work will be set forth in the written estimate or
        service agreement provided to you. You agree to pay all amounts due for work performed
        according to the agreed terms.
      </p>

      <h3 className="text-lg font-semibold mt-6 mb-2">4.1 Clear Water Guarantee</h3>
      <p className="mb-4">
        If your water is not clear after a service visit and the cause is our workmanship — missed
        steps, incorrect chemistry, or an error by our technician — we return the same day, at no
        charge, to correct it. Same-day return is subject to notifying us on the day of the visit;
        reports made afterward are scheduled for the next available service window.
      </p>
      <p className="mb-4">
        If the water condition is caused by factors outside our control — landscaping or yard work,
        heavy debris, storms, construction, pets or heavy bather load, algae blooms following missed
        or skipped visits, equipment failure, refills, or third-party chemical additions — the
        return visit is not covered by the guarantee. In those cases we provide one (1)
        complimentary corrective visit per customer; any additional work is quoted and billed
        separately at standard rates.
      </p>


      <h2 className="text-xl font-semibold mt-8 mb-2">5. User Conduct</h2>
      <p className="mb-4">
        You agree not to misuse our website or services, including by attempting unauthorized
        access, transmitting malicious code, scraping, or using our messaging program to harass,
        spam, or send unlawful content. We may suspend or terminate access for any user who
        violates these Terms.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">6. Intellectual Property</h2>
      <p className="mb-4">
        All content on the website — including text, graphics, logos, images, and software — is the
        property of Santana &amp; Rivera or its licensors and is protected by U.S. and international
        intellectual-property laws. You may not reproduce, distribute, or create derivative works
        without our prior written consent.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">7. Disclaimer of Warranties</h2>
      <p className="mb-4">
        Our website and the services offered through it are provided on an "as is" and "as
        available" basis without warranties of any kind, either express or implied, including
        implied warranties of merchantability, fitness for a particular purpose, and
        non-infringement, except where prohibited by law.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">8. Limitation of Liability</h2>
      <p className="mb-4">
        In no event shall Santana &amp; Rivera, its directors, employees, contractors, or agents be liable
        to you or any third party for any direct, indirect, consequential, exemplary, incidental,
        special, or punitive damages — including lost profits, lost data, or business interruption —
        arising from your use of the site, the SMS program, or our services, even if we have been
        advised of the possibility of such damages. To the maximum extent permitted by law, our
        total liability for any claim shall not exceed the amount you paid Santana &amp; Rivera for the
        services giving rise to the claim.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">9. Indemnification</h2>
      <p className="mb-4">
        You agree to defend, indemnify, and hold harmless Santana &amp; Rivera and its officers,
        directors, employees, and agents from any claims, liabilities, damages, losses, and
        expenses (including reasonable attorneys' fees) arising out of or related to your violation
        of these Terms or misuse of our services.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">10. Governing Law &amp; Dispute Resolution</h2>
      <p className="mb-4">
        These Terms are governed by the laws of the State of Texas, without regard to its conflict
        of laws principles. Any disputes arising out of or related to these Terms or our services
        shall be resolved in the state or federal courts located in Texas, and you consent to the
        personal jurisdiction of those courts.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">11. Changes to These Terms</h2>
      <p className="mb-4">
        We may update these Terms from time to time. When we do, we will revise the "Last Updated"
        date above. Continued use of our website or services after changes take effect constitutes
        acceptance of the revised Terms.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">12. Severability</h2>
      <p className="mb-4">
        If any provision of these Terms is found to be unenforceable, the remaining provisions
        shall remain in full force and effect.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">13. Contact Us</h2>
      <p className="mb-1"><strong>Santana &amp; Rivera (dba Savvy Swim)</strong></p>
      <p className="mb-1">Email: <a href="mailto:hi@savagepools.us" className="text-amber-brand">hi@savagepools.us</a></p>
      <p className="mb-1">Phone: <a href="tel:+14697440379" onClick={() => trackContactClick("call_click", "terms_body")} className="text-amber-brand">(469) 744-0379</a></p>
      <p className="mb-1">Website: <a href="https://savvyswim.com" className="text-amber-brand">https://savvyswim.com</a></p>
    </article>
  </main>
);
export default Terms;
