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
    pass: "sfzvbkeulxumhqdp" // 🔐 SIN ESPACIOS
  }
});

// Verificar conexión SMTP
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Error con el correo:", error);
  } else {
    console.log("✅ Servidor de correo listo para enviar mensajes");
  }
});

// --------------------------------------------------
// RUTAS API
// --------------------------------------------------
app.post("/api/devotos", (req, res) => {
  console.log("📩 Datos recibidos:", req.body);

  const { cui, nombres, apellidos, telefono, correo, direccion, fn, nota, sexo } = req.body;

  if (!cui || !nombres || !apellidos || !correo) {
    console.log("⚠️ Campos faltantes");
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }

  db.query("SELECT * FROM devotos WHERE cui = ?", [cui], async (err, results) => {
    if (err) {
      console.error("❌ Error en SELECT:", err);
      return res.status(500).json({ error: "Error verificando registro" });
    }

    console.log("🔍 Resultado SELECT:", results);

    const mailOptions = {
      from: '"Virgen de la Soledad" <virgendelasoledadmixco@gmail.com>',
      to: correo,
      subject: "Confirmación de registro",
      html: `
        <h2>¡Gracias por registrarte!</h2>
        <p>Su registro ha sido recibido correctamente.</p>
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

        console.log("📝 Registro actualizado");
        res.json({ message: "Actualizado y correo enviado" });
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

        console.log("📝 Registro insertado");
        res.json({ message: "Registrado y correo enviado" });
      });
    }
  });
});
