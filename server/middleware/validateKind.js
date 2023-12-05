export default async function (req, res, next) {
  //   const kind = req.params.kind;
  const kinds = ['restr', 'hm'];
  if (!kinds.includes(req.params.kind)) {
    return res
      .status(400)
      .send('Invalid kind. Please use "restr", "hm" or "other".');
  }

  next();
}
