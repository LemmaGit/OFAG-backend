export default (fn) => (req, res, next) => {
  fn(req, res, next).catch((err) => {
    if (!(err instanceof Error)) {
      err = new Error(err);
    }
    next(err);
  });
};
