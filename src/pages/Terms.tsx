const Terms = () => (
  <main className="min-h-screen bg-background text-foreground px-6 py-16">
    <article className="max-w-3xl mx-auto">
      <a href="/" className="text-amber-brand text-sm">&larr; Back to Savage Pools</a>
      <h1 className="text-3xl font-bold mt-4 mb-2">Terms and Conditions</h1>
      <p className="text-sm text-muted-foreground mb-1"><strong>Effective Date:</strong> June 23, 2026</p>
      <p className="text-sm text-muted-foreground mb-1"><strong>Company:</strong> Manor Fix LLC</p>
      <p className="text-sm text-muted-foreground mb-8">
        <strong>Website:</strong>{" "}
        <a href="https://savagesupplies.us" className="text-amber-brand">https://savagesupplies.us</a>
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">1. Acceptance of Terms</h2>
      <p className="mb-4">
        By accessing our website (https://savagesupplies.us) or utilizing the services provided by
        Manor Fix LLC, you agree to be bound by these Terms and Conditions. If you do not agree
        with any part of these terms, you must not use our website or services.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">2. Services Provided</h2>
      <p className="mb-4">
        Manor Fix LLC provides repair, maintenance, and contracting services. All estimates
        provided are subject to change based on the physical scope of work determined upon on-site
        inspection.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">3. SMS Text Messaging Terms</h2>
      <p className="mb-4">
        By opting into our SMS communications via our website form or physical intake forms, you
        agree to the following terms regarding text messaging:
      </p>
      <ul className="space-y-3 mb-4 list-disc pl-6">
        <li>
          <strong>Use Case:</strong> Text messaging will be used to send service estimates,
          appointment reminders, maintenance updates, and customer support.
        </li>
        <li>
          <strong>Message Frequency:</strong> Message frequency varies based on your requested
          services and appointments.
        </li>
        <li>
          <strong>Costs:</strong> Standard message and data rates may apply depending on your
          cellular provider plan.
        </li>
        <li>
          <strong>Opt-Out:</strong> You may opt-out of receiving text messages at any time by
          replying "STOP", "CANCEL", "UNSUBSCRIBE", or "QUIT" to any message you receive from us.
        </li>
        <li>
          <strong>Support:</strong> If you need assistance, reply "HELP" to any message, or contact
          us through our website.
        </li>
        <li>
          <strong>Carrier Liability:</strong> Mobile carriers are not liable for delayed or
          undelivered messages.
        </li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-2">4. Limitation of Liability</h2>
      <p className="mb-4">
        In no event shall Manor Fix LLC, its directors, employees, or agents be liable to you or
        any third party for any direct, indirect, consequential, exemplary, incidental, special, or
        punitive damages arising from your use of the site or our services.
      </p>
    </article>
  </main>
);
export default Terms;
