const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function updateBucket() {
  const { data, error } = await supabase.storage.updateBucket('product-images', {
    public: true,
    allowedMimeTypes: ['image/webp'],
    fileSizeLimit: 5242880
  });

  if (error) {
    console.error('Failed to update bucket:', error);
  } else {
    console.log('Successfully updated product-images bucket to ONLY allow WebP!');
  }
}

updateBucket();
