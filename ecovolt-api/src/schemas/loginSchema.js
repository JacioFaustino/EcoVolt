const { z } = require('zod');

const loginSchema = z.object({
  email: z.string()
    .email()
    .max(100),

  senha: z.string()
    .min(1)
    .max(100)
}).strict();

module.exports = {
  loginSchema
};