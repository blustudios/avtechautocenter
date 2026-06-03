
CREATE OR REPLACE FUNCTION public.relatorio_custos_resumo(
  p_data_from date DEFAULT NULL,
  p_data_to date DEFAULT NULL,
  p_fornecedor_id uuid DEFAULT NULL,
  p_sem_fornecedor boolean DEFAULT false,
  p_item text DEFAULT NULL,
  p_servico_id text DEFAULT NULL
)
RETURNS TABLE (
  total_valor numeric,
  total_itens bigint,
  total_quantidade numeric,
  total_servicos bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(SUM(c.valor), 0)::numeric AS total_valor,
    COUNT(*)::bigint AS total_itens,
    COALESCE(SUM(c.quantidade), 0)::numeric AS total_quantidade,
    COUNT(DISTINCT c.servico_id)::bigint AS total_servicos
  FROM public.servicos_custos c
  WHERE (p_data_from IS NULL OR c.data_compra >= p_data_from)
    AND (p_data_to IS NULL OR c.data_compra <= p_data_to)
    AND (
      (p_sem_fornecedor = true AND c.fornecedor_id IS NULL)
      OR (p_sem_fornecedor = false AND (p_fornecedor_id IS NULL OR c.fornecedor_id = p_fornecedor_id))
    )
    AND (p_item IS NULL OR c.item ILIKE '%' || p_item || '%')
    AND (p_servico_id IS NULL OR c.servico_id ILIKE '%' || p_servico_id || '%');
$$;

GRANT EXECUTE ON FUNCTION public.relatorio_custos_resumo(date, date, uuid, boolean, text, text) TO authenticated;
