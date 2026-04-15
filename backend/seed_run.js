require('dotenv').config();
const {Client} = require('pg');
const c = new Client({connectionString: process.env.DATABASE_URL});
c.connect()
  .then(() => c.query("INSERT INTO obras (nombre) VALUES ('La Plata 659'),('UATRE'),('Mitre 1117'),('Cabrera 3742'),('Cabrera 3832'),('Junin 575'),('L.S. Pena'),('Alsina 718'),('Tucuman 780'),('Medrano 1162') ON CONFLICT DO NOTHING"))
  .then(() => c.query("INSERT INTO parametros (clave,valor) VALUES ('tipo_cambio_actual','1430'),('email_alertas','admin@finobras.com') ON CONFLICT DO NOTHING"))
  .then(() => { console.log('Datos OK'); c.end(); })
  .catch(e => { console.log('Error:', e.message); c.end(); });
