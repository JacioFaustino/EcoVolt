class AppError extends Error {
  constructor(mensagem, statusCode = 500) {
    super(mensagem);

    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}

module.exports = AppError;