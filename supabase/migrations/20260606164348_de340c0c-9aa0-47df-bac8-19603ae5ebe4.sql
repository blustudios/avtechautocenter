CREATE OR REPLACE FUNCTION public.relatorio_pagamentos_resumo(
  p_data_from date DEFAULT NULL,
  p_data_to date DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_tipo text DEFAULT NULL,
  p_maquininha_id uuid DEFAULT NULL,
  p_sem_maquininha boolean DEFAULT false,
  p_bandeira_id uuid DEFAULT NULL,
  p_servico_id text DEFAULT NULL
)
RETURNS TABLE (
  total_pago numeric,
  total_pendente numeric,
  total_taxas numeric,
  total_itens bigint,
  total_servicos bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(SUM(CASE WHEN p.pago THEN p.valor ELSE 0 END), 0)::numeric AS total_pago,
    COALESCE(SUM(CASE WHEN NOT p.pago THEN p.valor ELSE 0 END), 0)::numeric AS total_pendente,
    COALESCE(SUM(CASE WHEN p.pago THEN p.valor * p.taxa_aplicada / 100 ELSE 0 END), 0)::numeric AS total_taxas,
    COUNT(*)::bigint AS total_itens,
    COUNT(DISTINCT p.servico_id)::bigint AS total_servicos
  FROM public.servicos_pagamentos p
  WHERE (p_data_from IS NULL OR p.data_pagamento >= p_data_from)
    AND (p_data_to IS NULL OR p.data_pagamento <= p_data_to)
    AND (p_status IS NULL OR p_status = 'todos'
         OR (p_status = 'pago' AND p.pago = true)
         OR (p_status = 'pendente' AND p.pago = false))
    AND (p_tipo IS NULL OR p.tipo = p_tipo)
    AND (
      (p_sem_maquininha = true AND p.maquininha_id IS NULL)
      OR (p_sem_maquininha = false AND (p_maquininha_id IS NULL OR p.maquininha_id = p_maquininha_id))
    )
    AND (p_bandeira_id IS NULL OR p.bandeira_id = p_bandeira_id)
    AND (p_servico_id IS NULL OR p.servico_id ILIKE '%' || p_servico_id || '%');
$$;

GRANT EXECUTE ON FUNCTION public.relatorio_pagamentos_resumo(date, date, text, text, uuid, boolean, uuid, text) TO authenticated;