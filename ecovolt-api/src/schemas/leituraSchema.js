const { z } = require('zod');

const leituraSchema = z.object({
  id_sensor: z.coerce
    .number()
    .int()
    .positive(),

  corrente_rms_A: z.coerce
    .number()
    .min(0)
    .max(1000)
    .optional(),

  tensao_rms_V: z.coerce
    .number()
    .min(0)
    .max(1000)
    .optional(),

  potencia_ativa_W: z.coerce
    .number()
    .min(0)
    .max(100000)
    .optional(),

  fator_potencia: z.coerce
    .number()
    .min(0)
    .max(1)
    .optional(),

  energia_intervalo_kWh: z.coerce
    .number()
    .min(0)
    .max(1000)
    .optional(),

  energia_acumulada_kWh: z.coerce
    .number()
    .min(0)
    .max(100000000)
    .optional(),

  timestamp: z.coerce
    .date()
    .optional(),

  qualidade_sinal: z.coerce
    .number()
    .int()
    .min(0)
    .max(100)
    .optional(),

  estado_porta: z.enum([
    'ABERTA',
    'FECHADA'
]).optional()
}).strict();

module.exports = {
  leituraSchema
};