export default async function (req, res, next) {
  const kinds = ['restr', 'hm', 'other'];
  if (!kinds.includes(req.params.kind)) {
    return res
      .status(400)
      .send('Invalid kind. Please use "restr", "hm" or "other".');
  }

  next();
}
