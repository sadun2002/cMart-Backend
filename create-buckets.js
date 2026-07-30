const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createBuckets() {
  const bucketsToCreate = ['product-images', 'themes', 'logos'];

  for (const bucket of bucketsToCreate) {
    console.log(`Checking bucket: ${bucket}...`);
    const { data: existingBucket, error: getError } = await supabase.storage.getBucket(bucket);
    
    if (getError && getError.message.includes('not found')) {
      console.log(`Creating bucket: ${bucket}...`);
      const { data, error } = await supabase.storage.createBucket(bucket, {
        public: true, // Make images public so they can be viewed on the frontend
        allowedMimeTypes: ['image/webp'],
        fileSizeLimit: 5242880 // 5MB
      });

      if (error) {
        console.error(`Failed to create ${bucket}:`, error.message);
      } else {
        console.log(`Successfully created public bucket: ${bucket}`);
      }
    } else if (existingBucket) {
      console.log(`Bucket ${bucket} already exists.`);
    } else if (getError) {
      console.error(`Error checking bucket ${bucket}:`, getError.message);
    }
  }
}

createBuckets().then(() => console.log('Done!'));
