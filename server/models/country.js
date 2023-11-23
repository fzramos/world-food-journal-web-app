import mongoose from 'mongoose';

const countrySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  code: {
    type: String,
    required: true,
  },
});

const Country = mongoose.model('country', countrySchema);

export default Country;
