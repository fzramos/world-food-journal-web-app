const MongoClient = require('mongodb').MongoClient;
const dotenv = require("dotenv")
dotenv.config()
const fs = require('fs');
const mongoUri = process.env.WFJ_mongoUri;
const jsonFilePath = './server/setup/country_collection_initial.json';

const readJsonFile = async () => {
  const fileContent = await fs.promises.readFile(jsonFilePath, 'utf-8');
  const data = JSON.parse(fileContent);
  return data;
};

const client = new MongoClient(mongoUri);

let data

client.connect(async function(err, client) {
  if (err) {
    console.error(err);
    return;
  }

  data = await readJsonFile();

  // Connected!
  console.log('connected')

  // Do your database operations here
  // Perform a simple database operation
  const db = client.db('worldFoodJournal');
  const collection = db.collection('country');

  // upload to DB
  collection.insertMany(data, function(err, result) {
    if (err) {
      console.error(err);
      return;
    }

    console.log('Successfully inserted data into collection!');
  })

  // see results
  const results = await collection.find().toArray();
  console.log(results)
  client.close();
});
