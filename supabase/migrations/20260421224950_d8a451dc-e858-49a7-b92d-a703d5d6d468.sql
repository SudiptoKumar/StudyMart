CREATE TABLE public.hero_banners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  heading TEXT NOT NULL DEFAULT '',
  subheading TEXT NOT NULL DEFAULT '',
  button_label TEXT NOT NULL DEFAULT '',
  button_link TEXT NOT NULL DEFAULT '/shop',
  gradient_from TEXT NOT NULL DEFAULT '#6366f1',
  gradient_to TEXT NOT NULL DEFAULT '#a855f7',
  image_url TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hero_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views active banners"
  ON public.hero_banners FOR SELECT
  USING (active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage banners"
  ON public.hero_banners FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_hero_banners_updated_at
  BEFORE UPDATE ON public.hero_banners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_hero_banners_position ON public.hero_banners(position);

INSERT INTO public.hero_banners (heading, subheading, button_label, button_link, gradient_from, gradient_to, position, active)
VALUES (
  'The Collected Volume — every work in one bundle.',
  'Save 30% this week only.',
  'Shop now',
  '/product/the-collected-volume',
  '#6366f1',
  '#a855f7',
  0,
  true
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.hero_banners;