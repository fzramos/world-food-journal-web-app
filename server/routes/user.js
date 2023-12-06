import { genSalt, hash } from 'bcrypt';
import { Router } from 'express';
import { pick } from 'lodash-es';
// import { pick } from 'lodash';
const router = Router();
import { User, validate } from '../models/user.js';
import 'dotenv/config.js';
import auth from '../middleware/auth.js';

router.get('/me', auth, async (req, res) => {
  // give users a simple route to get ONLY THEIR OWN user details
  // not using API parameters on purpose so (EX: /:id) so only the credentialed
  // user can see their own data
  const user = await User.findById(req.user._id).select('-password -__v');

  res.send(user);
});

router.post('/register', async (req, res) => {
  try {
    await validate(req.body);
    // make sure new user details meet requirements
  } catch (err) {
    return res.status(400).send(err.details[0].message);
  }
  let user = await User.findOne({
    name: req.body.name,
  });
  if (user)
    return res
      .status(400)
      .send(
        `The username "${req.body.name}" is already registered to a different account`
      );
  if (!(req.body.password === req.body.repeat_password))
    return res
      .status(400)
      .send(
        'The "password" value does not match the given "repeat_password" value'
      );

  user = new User(pick(req.body, ['name', 'email', 'password']));
  // hashing password
  const salt = await genSalt(10);
  user.password = await hash(req.body.password, salt);

  await user.save();

  const token = user.generateAuthToken();

  res.header('x-auth-token', token).send(pick(user, ['_id', 'name', 'email']));
});

export default router;
