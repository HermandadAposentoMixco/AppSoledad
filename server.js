import express from "express";
import cors from "cors";
import mysql from "mysql2";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";

// --------------------------------------------------
// CONFIG BÁSICA
// --------------------------------------------------
const app = express();
const PORT = process.env.PORT || 4000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --------------------------------------------------
// MIDDLEWARE
// --------------------------------------------------
app.use(cors());
app.use(express.json());

// --------------------------------------------------
// SERVIR FRONTEND
// --------------------------------------------------
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --------------------------------------------------
// MYSQL (POOL)
// --------------------------------------------------
const db = mysql.createPool({
  host: "bc1f5keqcm2p0h7qnkw6-mysql.services.clever-cloud.com",
  user: "u7hsnsh0t3uzwlc0",
  password: "4mqEiSVuxLl4nEcjFCjd",
  database: "bc1f5keqcm2p0h7qnkw6",
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  ssl: {
    rejectUnauthorized: false
  }
});

// --------------------------------------------------
// CONFIG CORREO (GMAIL SMTP)
// --------------------------------------------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "virgendelasoledadmixco@gmail.com",
    pass: "rzbx lymy lpzt lynm" // TU CONTRASEÑA DE APLICACIÓN
  }
});

// --------------------------------------------------
// RUTAS API
// --------------------------------------------------
app.get("/api/devotos/:cui", (req, res) => {
  const { cui } = req.params;
  db.query("SELECT * FROM devotos WHERE cui = ?", [cui], (err, results) => {
    if (err) return res.status(500).json({ error: "Error en la consulta" });
    if (results.length === 0) return res.status(404).json({ message: "No encontrado" });
    res.json(results[0]);
  });
});

app.post("/api/devotos", async (req, res) => {
  const { cui, nombres, apellidos, telefono, correo, direccion, fn, nota, sexo } = req.body;

  if (!cui || !nombres || !apellidos || !correo) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }

  db.query("SELECT * FROM devotos WHERE cui = ?", [cui], async (err, results) => {
    if (err) return res.status(500).json({ error: "Error verificando registro" });

    const verificationLink = `https://tusitio.com/verificar?correo=${encodeURIComponent(correo)}`;

    const mailOptions = {
      from: '"Virgen de la Soledad" <virgendelasoledadmixco@gmail.com>',
      to: correo,
      subject: "Confirmación de registro",
      html: `
        <h2>¡Gracias por registrarte!</h2>
        <p>Estimado Devota(o) con gran gozo espiritual y profundo devoción, comunicamos que la hermandad de la Virgen Soledad ha registrado(a) en nuestra base de datos, su pre-inscripción. Invitamos a qué pueda estar atento a nuestras redes sociales donde estaremos indicando la fecha de entrega de su cartulina así mismo del pago correspondiente.</p>
        <p>¡Que la fe y la devoción sigan guiando nuestro caminar!</p>
      `
    };

    if (results.length > 0) {
      const sql = `
        UPDATE devotos
        SET nombres=?, apellidos=?, telefono=?, correo=?, direccion=?, fn=?, nota=?, sexo=?
        WHERE cui=?
      `;
      const params = [nombres, apellidos, telefono, correo, direccion, fn, nota, sexo, cui];

      db.query(sql, params, async err2 => {
        if (err2) return res.status(500).json({ error: "Error al actualizar registro" });

        // Enviar correo
        await transporter.sendMail(mailOptions);
        res.json({ message: "Actualizado correctamente y correo enviado" });
      });
    } else {
      const sql = `
        INSERT INTO devotos (cui, nombres, apellidos, telefono, correo, direccion, fn, nota, sexo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const params = [cui, nombres, apellidos, telefono, correo, direccion, fn, nota, sexo];

      db.query(sql, params, async err3 => {
        if (err3) return res.status(500).json({ error: "Error al guardar registro" });

        // Enviar correo
        await transporter.sendMail(mailOptions);
        res.json({ message: "Registrado correctamente y correo enviado" });
      });
    }
  });
});

app.get("/api/all", (req, res) => {
  db.query("SELECT * FROM devotos ORDER BY fecha_registro DESC", (err, results) => {
    if (err) return res.status(500).json({ error: "Error cargando registros" });
    res.json(results);
  });
});

// --------------------------------------------------
// HEALTH CHECK (Render)
// --------------------------------------------------
app.get("/healthz", (req, res) => res.send("OK"));

// --------------------------------------------------
// START SERVER
// --------------------------------------------------
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
});
