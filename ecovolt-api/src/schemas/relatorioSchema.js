const { z } = require('zod');

const relatorioSchema = z.object({
  id_sala: z.coerce
    .number()
    .int()
    .positive(),

  tipo_relatorio: z.enum([
    'CONSUMO',
    'ALERTAS',
    'DISPOSITIVOS_OFFLINE'
  ]),

  periodo_inicio: z.string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      'periodo_inicio deve estar no formato YYYY-MM-DD'
    ),

  periodo_fim: z.string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      'periodo_fim deve estar no formato YYYY-MM-DD'
    )
}).superRefine((dados, contexto) => {
  const inicio =
    new Date(`${dados.periodo_inicio}T00:00:00`);

  const fim =
    new Date(`${dados.periodo_fim}T00:00:00`);

  if (
    Number.isNaN(inicio.getTime()) ||
    Number.isNaN(fim.getTime())
  ) {
    contexto.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Período inválido'
    });

    return;
  }

  if (fim < inicio) {
    contexto.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['periodo_fim'],
      message:
        'periodo_fim não pode ser anterior ao periodo_inicio'
    });
  }
});

module.exports = {
  relatorioSchema
};