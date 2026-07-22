-- ============================================================================
-- LoyalBox — valgfri label til standerens eget/frie link
-- Så en forretning kan navngive sit ekstra link, fx "Menukort" eller "Book bord",
-- i stedet for et generisk "Se mere". Bruges på den offentlige review-side.
-- ============================================================================

alter table public.stands
  add column if not exists custom_label text;
