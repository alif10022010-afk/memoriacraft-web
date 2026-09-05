// Konfigurasi Supabase
const SUPABASE_URL = "https://xfabtzjemkbjditdyjna.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmYWJ0emplbWtiamRpdGR5am5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwOTU2NTQsImV4cCI6MjEwMzY3MTY1NH0.6_FL4vRH0PfaIFd8rT8NX1ZoHI2aWO4x8xMgTslqsKk";

// Inisialisasi client Supabase (menggunakan variabel yang di atas)
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Nomor WhatsApp Admin Memoriacraft
const ADMIN_WA_NUMBER = "6283847857757";