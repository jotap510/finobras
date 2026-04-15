require('dotenv').config();
const {Client} = require('pg');
const bcrypt = require('bcryptjs');
const c = new Client({connectionString: process.env.DATABASE_URL});
c.connect()
  .then(() => bcrypt.hash('finobras2026', 10))
  .then(hash => c.query("INSERT INTO usuarios (nombre, email, password, rol) VALUES ('Admin', 'admin@finobras.com', '" + hash + "', 'admin') ON CONFLICT DO NOTHING"))
  .then(() => { console.log('Usuario OK'); c.end(); })
  .catch(e => { console.log('Error:', e.message); c.end(); });
