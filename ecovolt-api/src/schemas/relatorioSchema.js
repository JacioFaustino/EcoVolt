const { z } = require('zod');

const { calcularPeriodo } = require('../utils/periodosRelatorio');

const DATA = /^\d{4}-\d{2}-\d{2}$/;

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

  periodicidade: z
    .enum([
      'DIARIO',
      'SEMANAL',
      'MENSAL',
      'ANUAL',
      'PERSONALIZADO'
    ])
    .default('PERSONALIZADO'),

  data_referencia: z
    .string()
    .regex(
      DATA,
      'data_referencia deve estar no formato YYYY-MM-DD'
    )
    .optional(),

  periodo_inicio: z
    .string()
    .regex(
      DATA,
      'periodo_inicio deve estar no formato YYYY-MM-DD'
    )
    .optional(),

  periodo_fim: z
    .string()
    .regex(
      DATA,
      'periodo_fim deve estar no formato YYYY-MM-DD'
    )
    .optional()
}).strict().superRefine((dados, contexto) => {
  if (dados.periodicidade !== 'PERSONALIZADO') {
    return;
  }

  if (!dados.periodo_inicio || !dados.periodo_fim) {
    contexto.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        'Para periodicidade PERSONALIZADO informe periodo_inicio e periodo_fim'
    });

    return;
  }

  if (dados.periodo_fim < dados.periodo_inicio) {
    contexto.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['periodo_fim'],
      message:
        'periodo_fim não pode ser anterior ao periodo_inicio'
    });
  }
}).transform((dados) => {
  if (dados.periodicidade === 'PERSONALIZADO') {
    return dados;
  }

  const { inicio, fim } = calcularPeriodo(
    dados.periodicidade,
    dados.data_referencia
  );

  return {
    ...dados,
    periodo_inicio: inicio,
    periodo_fim: fim
  };
});

module.exports = { relatorioSchema };