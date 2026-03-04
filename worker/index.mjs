import 'dotenv/config';
import axios from 'axios';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("URL:", SUPABASE_URL);
console.log("KEY length:", SERVICE_KEY?.length);
console.log("KEY starts:", SERVICE_KEY?.slice(0,20));

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing env vars.");
  process.exit(1);
}

const client = axios.create({
  baseURL: `${SUPABASE_URL}/rest/v1`,
  headers: {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json"
  }
});

async function test() {
  try {
    const res = await client.get('/video_jobs?select=*');
    console.log("Status:", res.status);
    console.log("Data:", res.data);
  } catch (err) {
    if (err.response) {
      console.log("Status:", err.response.status);
      console.log("Response:", err.response.data);
    } else {
      console.error(err.message);
    }
  }
}

test();
