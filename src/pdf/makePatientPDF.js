const PdfPrinter = require("pdfmake");
const styles = require("./pdfStyles");

const fonts = {
  Roboto: {
    normal: __dirname + '/../fonts/Roboto-Regular.ttf',
    bold: __dirname + '/../fonts/Roboto-Bold.ttf'
  }
};


const printer = new PdfPrinter(fonts);

function buildHistoryTables(historial) {
  const sections = [];

  historial.forEach(day => {
    sections.push({ text: `\n📅 ${day.fecha}`, style: "dateHeader" });

    const tableBody = [
      [
        { text: 'Hora', style: 'tableHeader' },
        { text: 'Momento', style: 'tableHeader' },
        { text: 'Glucosa', style: 'tableHeader' },
        { text: 'Observación', style: 'tableHeader' },
        { text: 'Alerta', style: 'tableHeader' },
        { text: 'Respuesta',style: 'tableHeader'}
        
      ]
    ];

    day.registros.forEach(r => {
      tableBody.push([
        r.hora,
        r.momento,
        r.glucosa,
        r.alerta ? r.alerta.observacion : "-",
        r.alerta ? r.alerta.nivel : "-",
        r.alerta ? r.alerta.mensaje:"-"
       
      ]);
    });

    sections.push({
    table: {
        widths: ['10%', '18%', '12%', '22%', '18%', '20%'],
        body: tableBody
    },
    layout: {
  fillColor: (rowIndex) =>
    rowIndex === 0 ? null : (rowIndex % 2 === 0 ? "#F5F9FC" : "#FFFFFF"),
  hLineWidth: () => 0.7,
  vLineWidth: () => 0.7,
  hLineColor: () => "#D0DCE5",
  vLineColor: () => "#D0DCE5"
}

    });
  });

  return sections;
}

function createPdfDefinition(paciente) {
  return {
    content: [
  { text: "Informe Clínico – GlucoTracker", style: "header" },
  { canvas: [ { type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#0A3D62' } ], margin: [0, 5, 0, 10] },
  { text: "Datos del Paciente y Registro de Glucosa\n\n", style: "subheader" },

      {
  table: {
    widths: ["32%", "*"],
    body: [
      [{text: "Nombre", bold: true}, paciente.nombre],
      [{text: "C.I.", bold: true}, paciente.ci],
      [{text: "Fecha de Nacimiento", bold: true}, paciente.fechaNac],
      [{text: "Género", bold: true}, paciente.genero],
      [{text: "Peso (kg)", bold: true}, paciente.peso],
      [{text: "Altura (m)", bold: true}, paciente.altura],
      [{text: "Actividad Física", bold: true}, paciente.actividadFisica],
      [{text: "Teléfono", bold: true}, paciente.telefono],
      [{text: "Correo", bold: true}, paciente.Correo],
    ]
  },
  layout: {
    fillColor: () => null,
    hLineWidth: () => 0.7,
    vLineWidth: () => 0.7,
    hLineColor: () => "#D0DCE5",
    vLineColor: () => "#D0DCE5"
  },
  margin: [0, 0, 0, 20]
}
,

      // AFECCIONES
      { text: "2. Afecciones", style: "sectionHeader" },
      {
  columns: paciente.afecciones.map(a => ({
    text: a.afeccion,
    style: "tag",
    margin: [0, 2, 6, 2]
  })),
  margin: [0, 0, 0, 15]
},


      // TRATAMIENTOS
      { text: "3. Tratamientos", style: "sectionHeader" },
      ...paciente.tratamientos.map(t => ({
        table: {
          widths: ["30%", "*"],
          body: [
            ["Título", t.titulo],
            ["Descripción", t.desc],
            ["Dosis", t.dosis]
          ]
        },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 10]
      })),

      // HISTORIAL
      { text: "4. Historial de Glucosa", style: "sectionHeader" },
      ...buildHistoryTables(paciente.historial)
    ],
    styles
  };
}

function generatePatientPDF(paciente) {
  return new Promise((resolve, reject) => {
    try {
      const docDefinition = createPdfDefinition(paciente);
      const pdfDoc = printer.createPdfKitDocument(docDefinition);

      let chunks = [];
      pdfDoc.on("data", chunk => chunks.push(chunk));
      pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
      pdfDoc.on("error", err => reject(err));

      pdfDoc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = { generatePatientPDF };
