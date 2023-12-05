import mongoose from 'mongoose';

// This is as summary collection of meal kind counts for each country
// Not strictly required, could do MongoDB count queries on-demand instead
// But these counts need to be available lightening-quick to show up as
// tooltips on the React UI when a user is looking at their world map
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
