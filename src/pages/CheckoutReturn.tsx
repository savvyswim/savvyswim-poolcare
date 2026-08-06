import { Link, useSearchParams } from "@/lib/router-compat";
import { CheckCircle2 } from "lucide-react";
import { trackContactClick } from "@/lib/contactTracking";

export default function CheckoutReturn() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const orderNumber = params.get("order");

  return (
    <main className="min-h-screen grid place-items-center px-6 py-24 text-center">
      <div className="max-w-md space-y-4">
        <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
        <h1 className="text-2xl font-bold">
          {sessionId ? "Payment received" : "Checkout complete"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {orderNumber
            ? `Order ${orderNumber} is confirmed and paid. We'll email your receipt and delivery details shortly.`
            : "Thanks — we'll email your receipt and delivery details shortly."}
        </p>
        <p className="text-sm text-muted-foreground">
          Questions? Call{" "}
          <a href="tel:+14697440379" onClick={() => trackContactClick("call_click", "checkout_return")} className="font-semibold text-foreground">
            (469) 744-0379
          </a>
          .
        </p>
        <Link
          to="/"
          className="inline-flex rounded-full bg-primary px-6 py-2.5 text-sm font-bold uppercase tracking-wider text-primary-foreground"
        >
          Back to shop
        </Link>
      </div>
    </main>
  );
}
