function asyncHandler(funcao) {
  return function handler(req, res, next) {
    Promise
      .resolve(funcao(req, res, next))
      .catch(next);
  };
}

module.exports = asyncHandler;