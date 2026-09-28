const { z } = require('zod');

const dispositivoSchema = z.object({
  id_sala: z.coerce
    .number()
    .int()
    .positive(),

  identificador: z.string()
    .trim()
    .min(1)
    .max(50),

  mac_address: z.string()
    .trim()
    .regex(
      /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/,
      'mac_address deve estar no formato AA:BB:CC:DD:EE:FF'
    )
    .optional(),

  modelo: z.string()
    .trim()
    .max(50)
    .optional(),

  data_instalacao: z.coerce
    .date()
    .optional(),

  intervalo_envio_segundos: z.coerce
    .number()
    .int()
    .min(1)
    .max(3600)
    .default(2)
}).strict();

module.exports = {
  dispositivoSchema
};