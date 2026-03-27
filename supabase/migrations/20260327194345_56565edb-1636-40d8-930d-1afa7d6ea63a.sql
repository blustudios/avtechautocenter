-- Servicos: filtros e ordenacao
CREATE INDEX IF NOT EXISTS idx_servicos_status ON servicos(status);
CREATE INDEX IF NOT EXISTS idx_servicos_data_entrada ON servicos(data_entrada);
CREATE INDEX IF NOT EXISTS idx_servicos_cliente_cpf ON servicos(cliente_cpf);
CREATE INDEX IF NOT EXISTS idx_servicos_carro_placa ON servicos(carro_placa);
CREATE INDEX IF NOT EXISTS idx_servicos_status_pagamento ON servicos(status_pagamento);

-- Itens relacionados: JOINs e deletes por servico_id
CREATE INDEX IF NOT EXISTS idx_servicos_itens_servico ON servicos_itens(servico_id);
CREATE INDEX IF NOT EXISTS idx_servicos_pagamentos_servico ON servicos_pagamentos(servico_id);
CREATE INDEX IF NOT EXISTS idx_servicos_custos_servico ON servicos_custos(servico_id);
CREATE INDEX IF NOT EXISTS idx_servicos_pneus_servico ON servicos_pneus(servico_id);
CREATE INDEX IF NOT EXISTS idx_servicos_historico_servico ON servicos_historico(servico_id);

-- Pagamentos: filtro por data
CREATE INDEX IF NOT EXISTS idx_servicos_pagamentos_data ON servicos_pagamentos(data_pagamento);

-- Carros: busca por cliente
CREATE INDEX IF NOT EXISTS idx_carros_cliente_cpf ON carros(cliente_cpf);

-- Dashboard: custos por data
CREATE INDEX IF NOT EXISTS idx_servicos_custos_data ON servicos_custos(data_compra);