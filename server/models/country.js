import { Schema, model } from 'mongoose';

const countrySchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  code: {
    type: String,
    required: true,
  },
});

const Country = model('country', countrySchema);

export default Country;
