import { ChevronRight } from "lucide-react";
import type { HeroBanner } from "@/lib/banners";

type Props = {
  banner: Pick<
    HeroBanner,
    | "heading"
    | "subheading"
    | "button_label"
    | "button_link"
    | "gradient_from"
    | "gradient_to"
    | "image_url"
    | "image_only"
    | "show_button"
    | "text_color"
    | "background_color"
  >;
};

function buildBg(banner: Props["banner"]) {
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

export function BannerPreview({ banner }: Props) {
  const hasImage = !!banner.image_url;
  const imageOnly = hasImage && banner.image_only;
  const showButton = banner.show_button !== false;
  const link = banner.button_link?.trim();
  const textColor = banner.text_color || "#ffffff";

  const cardInner = imageOnly ? (
    <div
      className="relative overflow-hidden rounded-3xl shadow-card"
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
  ) : (
    <div
      className="relative overflow-hidden rounded-3xl p-5 shadow-card"
      style={{
        background: buildBg(banner),
        backgroundSize: "cover",
        backgroundPosition: "center",
        minHeight: 200,
        color: textColor,
      }}
    >
      <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
      <div className="relative">
        <span
          className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider backdrop-blur"
          style={{ color: textColor }}
        >
          Featured
        </span>
        <h2 className="mt-3 text-2xl font-bold leading-tight" style={{ color: textColor }}>
          {banner.heading || "Heading"}
        </h2>
        <p className="mt-2 text-sm" style={{ color: textColor, opacity: 0.9 }}>
          {banner.subheading || "Subheading"}
        </p>
        {showButton && (
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-foreground">
            {banner.button_label || "Shop now"} <ChevronRight className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-sm">
      {link ? (
        <a href={link} className="block">
          {cardInner}
        </a>
      ) : (
        cardInner
      )}
    </div>
  );
}

export function generateEmbedCode(banner: Props["banner"]): string {
  const link = banner.button_link?.trim() || "#";
  if (banner.image_url && banner.image_only) {
    const btn =
      banner.show_button !== false && banner.button_label
        ? `<span style="position:absolute;bottom:16px;left:16px;display:inline-block;padding:8px 16px;background:white;color:#111;border-radius:999px;font-size:12px;font-weight:600;">${banner.button_label} →</span>`
        : "";
    return `<a href="${link}" style="display:block;position:relative;aspect-ratio:16/9;border-radius:24px;overflow:hidden;font-family:system-ui,sans-serif;text-decoration:none;">
  <img src="${banner.image_url}" alt="${banner.heading || ""}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" />
  ${btn}
</a>`;
  }
  const bg = banner.image_url
    ? `linear-gradient(135deg, ${banner.gradient_from}cc, ${banner.gradient_to}cc), url('${banner.image_url}')`
    : `linear-gradient(135deg, ${banner.gradient_from}, ${banner.gradient_to})`;
  const btn =
    banner.show_button !== false
      ? `<span style="display:inline-block;margin-top:16px;padding:8px 16px;background:white;color:#111;border-radius:999px;font-size:12px;font-weight:600;">${banner.button_label} →</span>`
      : "";
  return `<a href="${link}" style="display:block;position:relative;aspect-ratio:16/9;border-radius:24px;padding:20px;color:white;text-decoration:none;background:${bg};background-size:cover;background-position:center;overflow:hidden;font-family:system-ui,sans-serif;">
  <h2 style="margin:0;font-size:24px;font-weight:700;line-height:1.2;text-shadow:0 1px 2px rgba(0,0,0,0.5);">${banner.heading}</h2>
  <p style="margin:8px 0 0;font-size:14px;opacity:0.9;text-shadow:0 1px 2px rgba(0,0,0,0.5);">${banner.subheading}</p>
  ${btn}
</a>`;
}
