const { z } = require('zod');

const configuracaoAlertaSchema = z.object({
  id_sala: z.coerce
    .number()
    .int()
    .positive(),

  tipo_parametro: z.enum([
    'R1_CONSUMO_FORA_HORARIO',
    'R2_AR_FORA_HORARIO',
    'R3A_PORTA_ABERTA',
    'R3B_PORTA_ABERTA_PERSISTENTE',
    'R4_SOBRECARGA',
    'R5_PADRAO_HISTORICO',
    'R6_LIMITE_DIARIO',
    'R7_DISPOSITIVO_OFFLINE',
    'R8_FALHA_LEITURA'
  ]),

  valor_limite: z.coerce
    .number()
    .min(0),

  unidade_medida: z.string()
    .trim()
    .min(1)
    .max(10),

  status: z.enum([
    'ATIVA',
    'INATIVA'
  ]).default('ATIVA'),

  acao_automatica: z.string()
    .trim()
    .max(100)
    .optional(),

  acionar_buzzer: z.coerce
    .boolean()
    .default(false),

  tempo_persistencia_segundos: z.coerce
    .number()
    .int()
    .min(0)
    .default(0),

  duracao_buzzer_segundos: z.coerce
    .number()
    .int()
    .min(0)
    .default(0)
}).strict();

const atualizarConfiguracaoAlertaSchema =
  configuracaoAlertaSchema.partial().omit({
    id_sala: true,
    tipo_parametro: true
  });

const statusConfiguracaoAlertaSchema =
  z.object({
    status: z.enum([
      'ATIVA',
      'INATIVA'
    ])
  }).strict();

module.exports = {
  configuracaoAlertaSchema,
  atualizarConfiguracaoAlertaSchema,
  statusConfiguracaoAlertaSchema
};