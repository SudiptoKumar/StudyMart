import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { useHeroBanners, type HeroBanner } from "@/lib/banners";
import { cn } from "@/lib/utils";

function StaticFallback() {
  return (
    <section className="px-5 pt-5">
      <div className="relative overflow-hidden rounded-3xl bg-primary p-5 text-primary-foreground shadow-card">
        <div className="relative">
          <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider backdrop-blur">
            New release
          </span>
          <h2 className="mt-3 text-2xl font-bold leading-tight">
            The Collected Volume — every work in one bundle.
          </h2>
          <p className="mt-2 text-sm text-white/80">Save 30% this week only.</p>
          <Link
            to="/shop"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-foreground"
          >
            Shop now <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function buildBg(banner: HeroBanner) {
  const hasImage = !!banner.image_url;
  if (banner.background_color) {
    return hasImage
      ? `linear-gradient(135deg, ${banner.background_color}cc, ${banner.background_color}cc), url(${banner.image_url})`
      : banner.background_color;
  }
  return hasImage
    ? `linear-gradient(135deg, ${banner.gradient_from}cc, ${banner.gradient_to}cc), url(${banner.image_url})`
    : `linear-gradient(135deg, ${banner.gradient_from}, ${banner.gradient_to})`;
}

function Slide({ banner }: { banner: HeroBanner }) {
  const hasImage = !!banner.image_url;
  const imageOnly = hasImage && banner.image_only;
  const showButton = banner.show_button !== false;
  const link = banner.button_link?.trim();
  const textColor = banner.text_color || "#ffffff";

  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    link ? (
      <a href={link} className="block w-full">
        {children}
      </a>
    ) : (
      <div className="block w-full">{children}</div>
    );

  if (imageOnly) {
    return (
      <Wrapper>
        <div
          className="relative w-full overflow-hidden rounded-3xl shadow-card"
          style={{ minHeight: 200 }}
        >
          <img
            src={banner.image_url!}
            alt={banner.heading || "Banner"}
            className="absolute inset-0 h-full w-full object-cover"
          />
          {showButton && banner.button_label && (
            <span className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-foreground shadow">
              {banner.button_label} <ChevronRight className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <div
        className="relative w-full overflow-hidden rounded-3xl p-5 shadow-card"
        style={{
          background: buildBg(banner),
          backgroundSize: "cover",
          backgroundPosition: "center",
          minHeight: 200,
          color: textColor,
        }}
      >
        <div className="relative">
          <span
            className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider backdrop-blur"
            style={{ color: textColor }}
          >
            Featured
          </span>
          <h2 className="mt-3 text-2xl font-bold leading-tight" style={{ color: textColor }}>
            {banner.heading}
          </h2>
          <p className="mt-2 text-sm" style={{ color: textColor, opacity: 0.9 }}>
            {banner.subheading}
          </p>
          {showButton && banner.button_label && (
            <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-foreground">
              {banner.button_label} <ChevronRight className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      </div>
    </Wrapper>
  );
}

export function HeroSlider() {
  const { banners, intervalSeconds, loading } = useHeroBanners();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" });
  const [selected, setSelected] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!emblaApi) return;
    const onSel = () => setSelected(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSel);
    onSel();
    return () => {
      emblaApi.off("select", onSel);
    };
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi || banners.length < 2 || paused) return;
    const id = setInterval(() => emblaApi.scrollNext(), intervalSeconds * 1000);
    return () => clearInterval(id);
  }, [emblaApi, intervalSeconds, banners.length, paused]);

  if (loading) {
    return (
      <section className="px-5 pt-5">
        <div className="h-[200px] animate-pulse rounded-3xl bg-secondary" />
      </section>
    );
  }

  if (banners.length === 0) return <StaticFallback />;

  if (banners.length === 1) {
    return (
      <section className="px-5 pt-5">
        <Slide banner={banners[0]} />
      </section>
    );
  }

  return (
    <section className="pt-5">
      <div
        className="overflow-hidden px-5"
        ref={emblaRef}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="flex gap-3">
          {banners.map((b) => (
            <div key={b.id} className="min-w-0 flex-[0_0_100%]">
              <Slide banner={b} />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex justify-center gap-1.5">
        {banners.map((b, i) => (
          <button
            key={b.id}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => emblaApi?.scrollTo(i)}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i === selected ? "w-6 bg-foreground" : "w-1.5 bg-foreground/30",
            )}
          />
        ))}
      </div>
    </section>
  );
}
