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
// CONFIG CORREO (BREVO SMTP)
// --------------------------------------------------
const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: "a17cbb001@smtp-brevo.com",
    pass: "M7DBtcf1LbxGAgNq"
  }
});

// Verificar conexión SMTP
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Error con SMTP:", error);
  } else {
    console.log("✅ Servidor de correo listo (Brevo)");
  }
});

// --------------------------------------------------
// RUTAS API
// --------------------------------------------------
app.post("/api/devotos", (req, res) => {
  console.log("📩 Datos recibidos:", req.body);

  const { cui, nombres, apellidos, telefono, correo, direccion, fn, nota, sexo } = req.body;

  if (!cui || !nombres || !apellidos || !correo) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }

  db.query("SELECT * FROM devotos WHERE cui = ?", [cui], async (err, results) => {
    if (err) {
      console.error("❌ Error en SELECT:", err);
      return res.status(500).json({ error: "Error verificando registro" });
    }

    // Código de verificación
    const codigo = Math.floor(100000 + Math.random() * 900000);

    const mailOptions = {
      from: '"Hermandad Virgen de la Soledad" <no-reply@hermandad.com>',
      to: correo,
      subject: "Confirmación de registro",
      html: `
        <h2>¡Gracias por registrarte!</h2>
        <p>Tu código de verificación es:</p>
        <h1>${codigo}</h1>
        <p>Por favor, ingrésalo en el sistema para completar tu registro.</p>
        <p>Que Dios le bendiga.</p>
      `
    };

    try {
      console.log("📨 Enviando correo...");
      await transporter.sendMail(mailOptions);
      console.log("✅ Correo enviado correctamente");
    } catch (emailError) {
      console.error("❌ Error al enviar correo:", emailError);
      return res.status(500).json({ error: "No se pudo enviar el correo" });
    }

    if (results.length > 0) {
      const sql = `
        UPDATE devotos
        SET nombres=?, apellidos=?, telefono=?, correo=?, direccion=?, fn=?, nota=?, sexo=?
        WHERE cui=?
      `;
      const params = [nombres, apellidos, telefono, correo, direccion, fn, nota, sexo, cui];

      db.query(sql, params, err2 => {
        if (err2) {
          console.error("❌ Error en UPDATE:", err2);
          return res.status(500).json({ error: "Error al actualizar registro" });
        }

        res.json({
          message: "Registro actualizado y correo enviado",
          codigo
        });
      });
    } else {
      const sql = `
        INSERT INTO devotos (cui, nombres, apellidos, telefono, correo, direccion, fn, nota, sexo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const params = [cui, nombres, apellidos, telefono, correo, direccion, fn, nota, sexo];

      db.query(sql, params, err3 => {
        if (err3) {
          console.error("❌ Error en INSERT:", err3);
          return res.status(500).json({ error: "Error al guardar registro" });
        }

        res.json({
          message: "Registrado correctamente y correo enviado",
          codigo
        });
      });
    }
  });
});

// --------------------------------------------------
// START SERVER
// --------------------------------------------------
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
});
