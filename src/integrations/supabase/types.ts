export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      bandeiras: {
        Row: {
          id: string
          maquininha_id: string
          nome: string
        }
        Insert: {
          id?: string
          maquininha_id: string
          nome: string
        }
        Update: {
          id?: string
          maquininha_id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "bandeiras_maquininha_id_fkey"
            columns: ["maquininha_id"]
            isOneToOne: false
            referencedRelation: "maquininhas"
            referencedColumns: ["id"]
          },
        ]
      }
      carros: {
        Row: {
          ano: number | null
          cliente_cpf: string
          cor: string | null
          marca: string | null
          modelo: string | null
          placa: string
        }
        Insert: {
          ano?: number | null
          cliente_cpf: string
          cor?: string | null
          marca?: string | null
          modelo?: string | null
          placa: string
        }
        Update: {
          ano?: number | null
          cliente_cpf?: string
          cor?: string | null
          marca?: string | null
          modelo?: string | null
          placa?: string
        }
        Relationships: [
          {
            foreignKeyName: "carros_cliente_cpf_fkey"
            columns: ["cliente_cpf"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["cpf"]
          },
        ]
      }
      clientes: {
        Row: {
          cpf: string
          created_at: string
          email: string | null
          nome: string
          whatsapp: string | null
        }
        Insert: {
          cpf: string
          created_at?: string
          email?: string | null
          nome: string
          whatsapp?: string | null
        }
        Update: {
          cpf?: string
          created_at?: string
          email?: string | null
          nome?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      estoque_pneus: {
        Row: {
          aro: string
          created_at: string
          id: string
          marca: string
          medida_01: string
          medida_02: string
          quantidade: number
          valor_medio_compra: number
          valor_venda: number
        }
        Insert: {
          aro: string
          created_at?: string
          id?: string
          marca: string
          medida_01: string
          medida_02: string
          quantidade?: number
          valor_medio_compra?: number
          valor_venda?: number
        }
        Update: {
          aro?: string
          created_at?: string
          id?: string
          marca?: string
          medida_01?: string
          medida_02?: string
          quantidade?: number
          valor_medio_compra?: number
          valor_venda?: number
        }
        Relationships: []
      }
      fornecedores: {
        Row: {
          created_at: string
          endereco: string | null
          id: string
          identificacao_extrato: string | null
          nome: string
          telefone: string | null
        }
        Insert: {
          created_at?: string
          endereco?: string | null
          id?: string
          identificacao_extrato?: string | null
          nome: string
          telefone?: string | null
        }
        Update: {
          created_at?: string
          endereco?: string | null
          id?: string
          identificacao_extrato?: string | null
          nome?: string
          telefone?: string | null
        }
        Relationships: []
      }
      maquininhas: {
        Row: {
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      servicos: {
        Row: {
          carro_placa: string | null
          cliente_cpf: string | null
          created_at: string
          custo_total: number
          data_encerramento: string | null
          data_entrada: string
          id: string
          lucro_liquido: number
          observacoes: string | null
          status: string
          status_pagamento: string
          valor_liquido: number
          valor_total: number
        }
        Insert: {
          carro_placa?: string | null
          cliente_cpf?: string | null
          created_at?: string
          custo_total?: number
          data_encerramento?: string | null
          data_entrada?: string
          id: string
          lucro_liquido?: number
          observacoes?: string | null
          status?: string
          status_pagamento?: string
          valor_liquido?: number
          valor_total?: number
        }
        Update: {
          carro_placa?: string | null
          cliente_cpf?: string | null
          created_at?: string
          custo_total?: number
          data_encerramento?: string | null
          data_entrada?: string
          id?: string
          lucro_liquido?: number
          observacoes?: string | null
          status?: string
          status_pagamento?: string
          valor_liquido?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "servicos_carro_placa_fkey"
            columns: ["carro_placa"]
            isOneToOne: false
            referencedRelation: "carros"
            referencedColumns: ["placa"]
          },
          {
            foreignKeyName: "servicos_cliente_cpf_fkey"
            columns: ["cliente_cpf"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["cpf"]
          },
        ]
      }
      servicos_custos: {
        Row: {
          fornecedor_id: string | null
          id: string
          item: string
          quantidade: number
          servico_id: string
          valor: number
        }
        Insert: {
          fornecedor_id?: string | null
          id?: string
          item: string
          quantidade?: number
          servico_id: string
          valor?: number
        }
        Update: {
          fornecedor_id?: string | null
          id?: string
          item?: string
          quantidade?: number
          servico_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "servicos_custos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servicos_custos_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      servicos_itens: {
        Row: {
          descricao: string
          id: string
          ordem: number
          servico_id: string
        }
        Insert: {
          descricao: string
          id?: string
          ordem?: number
          servico_id: string
        }
        Update: {
          descricao?: string
          id?: string
          ordem?: number
          servico_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "servicos_itens_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      servicos_pagamentos: {
        Row: {
          bandeira_id: string | null
          id: string
          maquininha_id: string | null
          parcelas: number | null
          servico_id: string
          taxa_aplicada: number
          tipo: string
          valor: number
        }
        Insert: {
          bandeira_id?: string | null
          id?: string
          maquininha_id?: string | null
          parcelas?: number | null
          servico_id: string
          taxa_aplicada?: number
          tipo: string
          valor?: number
        }
        Update: {
          bandeira_id?: string | null
          id?: string
          maquininha_id?: string | null
          parcelas?: number | null
          servico_id?: string
          taxa_aplicada?: number
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "servicos_pagamentos_bandeira_id_fkey"
            columns: ["bandeira_id"]
            isOneToOne: false
            referencedRelation: "bandeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servicos_pagamentos_maquininha_id_fkey"
            columns: ["maquininha_id"]
            isOneToOne: false
            referencedRelation: "maquininhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servicos_pagamentos_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      taxas: {
        Row: {
          bandeira_id: string
          id: string
          parcelas_ate: number | null
          parcelas_de: number | null
          percentual: number
          tipo_pagamento: string
        }
        Insert: {
          bandeira_id: string
          id?: string
          parcelas_ate?: number | null
          parcelas_de?: number | null
          percentual?: number
          tipo_pagamento: string
        }
        Update: {
          bandeira_id?: string
          id?: string
          parcelas_ate?: number | null
          parcelas_de?: number | null
          percentual?: number
          tipo_pagamento?: string
        }
        Relationships: [
          {
            foreignKeyName: "taxas_bandeira_id_fkey"
            columns: ["bandeira_id"]
            isOneToOne: false
            referencedRelation: "bandeiras"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_service_id: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
