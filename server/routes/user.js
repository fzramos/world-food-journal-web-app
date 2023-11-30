import jwt from 'jsonwebtoken';
import config from 'config';
import bcrypt from 'bcrypt';
import express from 'express';
import _ from 'lodash';
const router = express.Router();
import mongoose from 'mongoose';
import { User, validate } from '../models/user.js';
import 'dotenv/config.js';
import winston from 'winston';
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

  user = new User(_.pick(req.body, ['name', 'email', 'password']));
  // hashing password
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(req.body.password, salt);

  await user.save();

  const token = user.generateAuthToken();

  res
    .header('x-auth-token', token)
    .send(_.pick(user, ['_id', 'name', 'email']));
});

export default router;
