import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Waves, LogOut, Download, Copy, Mail, MessageSquare, ArrowLeft } from "lucide-react";

type Design = {
  id: string;
  title: string;
  description: string;
  style: string;
  features: string[];
  est_price_low: number | null;
  est_price_high: number | null;
  image_path: string;
  display_order: number;
};

export default function AdminDesigns() {
  const { user, isAdmin, loading, signOut, refreshRole } = useAuth();
  const nav = useNavigate();
  const [designs, setDesigns] = useState<Design[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      nav("/auth", { replace: true });
      return;
    }
    // Attempt to claim admin if none exists yet (silently)
    if (!isAdmin) {
      supabase.rpc("claim_admin_if_unowned").then(() => refreshRole());
    }
  }, [user, isAdmin, loading, nav, refreshRole]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      setLoadingData(true);
      const { data, error } = await supabase
        .from("pool_designs")
        .select("*")
        .order("display_order");
      if (error) {
        toast.error(error.message);
        setLoadingData(false);
        return;
      }
      setDesigns(data ?? []);
      // Signed URLs for the private bucket
      const paths = (data ?? []).map((d) => d.image_path);
      if (paths.length) {
        const { data: signed } = await supabase.storage
          .from("pool-designs")
          .createSignedUrls(paths, 60 * 60); // 1 hour
        const map: Record<string, string> = {};
        signed?.forEach((s) => {
          if (s.path && s.signedUrl) map[s.path] = s.signedUrl;
        });
        setUrls(map);
      }
      setLoadingData(false);
    })();
  }, [isAdmin]);

  if (loading || (!user && !loading)) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-xl font-semibold">Awaiting admin access</h1>
          <p className="text-sm text-muted-foreground">
            This account isn't an admin yet. If you're the owner and an admin already exists, ask them to grant you access.
          </p>
          <Button onClick={() => signOut().then(() => nav("/auth"))}>Sign out</Button>
        </div>
      </div>
    );
  }

  const shareDesign = async (d: Design, channel: "copy" | "email" | "sms") => {
    const url = urls[d.image_path];
    if (!url) return toast.error("Image not ready");
    const priceTxt =
      d.est_price_low && d.est_price_high
        ? ` Estimated investment: $${d.est_price_low.toLocaleString()}–$${d.est_price_high.toLocaleString()}.`
        : "";
    const msg = `Savage Pools design idea — ${d.title} (${d.style}).\n${d.description}${priceTxt}\nPreview (link valid 1 hour): ${url}`;
    if (channel === "copy") {
      await navigator.clipboard.writeText(msg);
      toast.success("Message copied — paste into a text or email");
    } else if (channel === "email") {
      window.location.href = `mailto:?subject=${encodeURIComponent("Pool design idea: " + d.title)}&body=${encodeURIComponent(msg)}`;
    } else {
      window.location.href = `sms:?&body=${encodeURIComponent(msg)}`;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-hairline">
        <div className="container-tight flex items-center justify-between py-4">
          <Link to="/" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            <Waves className="h-5 w-5 text-amber-brand" />
            <span className="font-semibold">Pool Design Gallery</span>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => signOut().then(() => nav("/"))}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </header>

      <main className="container-tight py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Texas family pool designs</h1>
          <p className="text-sm text-muted-foreground">
            {designs.length} designs ready to send to customers. Use Copy / Email / Text to share.
          </p>
        </div>

        {loadingData ? (
          <div className="text-muted-foreground">Loading designs…</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {designs.map((d) => (
              <Card key={d.id} className="overflow-hidden flex flex-col">
                {urls[d.image_path] ? (
                  <img
                    src={urls[d.image_path]}
                    alt={d.title}
                    loading="lazy"
                    width={1536}
                    height={1024}
                    className="w-full aspect-[3/2] object-cover"
                  />
                ) : (
                  <div className="w-full aspect-[3/2] bg-muted animate-pulse" />
                )}
                <div className="p-4 flex flex-col gap-3 flex-1">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-amber-brand">{d.style}</div>
                    <h3 className="font-semibold">{d.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3">{d.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {d.features.slice(0, 4).map((f) => (
                      <span key={f} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {f}
                      </span>
                    ))}
                  </div>
                  {d.est_price_low && d.est_price_high && (
                    <div className="text-sm font-medium">
                      ${d.est_price_low.toLocaleString()}–${d.est_price_high.toLocaleString()}
                    </div>
                  )}
                  <div className="mt-auto flex flex-wrap gap-2 pt-2">
                    <Button size="sm" variant="secondary" onClick={() => shareDesign(d, "copy")}>
                      <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => shareDesign(d, "email")}>
                      <Mail className="h-3.5 w-3.5 mr-1.5" /> Email
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => shareDesign(d, "sms")}>
                      <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Text
                    </Button>
                    {urls[d.image_path] && (
                      <a
                        href={urls[d.image_path]}
                        download={d.image_path}
                        className="inline-flex items-center text-xs px-3 py-1.5 rounded-md border border-hairline hover:bg-muted"
                      >
                        <Download className="h-3.5 w-3.5 mr-1.5" /> Image
                      </a>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
