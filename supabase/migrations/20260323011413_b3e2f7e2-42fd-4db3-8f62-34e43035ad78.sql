ALTER TABLE servicos_custos ADD COLUMN data_compra date;
UPDATE servicos_custos sc SET data_compra = s.data_entrada FROM servicos s WHERE sc.servico_id = s.id;
ALTER TABLE servicos_custos ALTER COLUMN data_compra SET DEFAULT CURRENT_DATE;