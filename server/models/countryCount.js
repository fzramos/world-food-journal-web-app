import mongoose from 'mongoose';

const countryCountSchema = new mongoose.Schema({
  cntryCd: {
    type: String,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  restr: {
    type: Number,
    default: 0,
  },
  hm: {
    type: Number,
    default: 0,
  },
  misc: {
    type: Number,
    default: 0,
  },
  wishlist: {
    type: Number,
    default: 0,
  },
});

countryCountSchema.index({ userId: 1, cntryCd: 1 }, { unique: true });

const CountryCount = mongoose.model('country_count', countryCountSchema);

export default CountryCount;
