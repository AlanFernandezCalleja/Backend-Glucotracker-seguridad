const express = require("express");
const router = express.Router();
const { generatePatientPDF } = require("../pdf/makePatientPDF");

router.post("/paciente/pdf", async (req, res) => {
  try {
    const paciente = req.body;

    if (!paciente) {
      return res.status(400).json({ error: "Debes enviar el objeto paciente" });
    }

    const pdfBuffer = await generatePatientPDF(paciente);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=paciente_${paciente.id}.pdf`,
      "Content-Length": pdfBuffer.length,
    });

    return res.send(pdfBuffer);
  } catch (error) {
    console.error("Error generando PDF:", error);
    return res.status(500).json({ error: "Error generando PDF" });
  }
});

module.exports = router;
