const getHipoTemplate = ({ nombrePaciente, valor, fecha, hora ,nombreMedico,observaciones}) => ({
  subject: `Alerta de Hipoglucemia - ${nombrePaciente}`,
  html: `
    <p>Estimado/a Doctor/a ${nombreMedico},</p>
    <p>Se detectó una medición baja de glucosa en el paciente <strong>${nombrePaciente}</strong>.</p>

    <p><strong>Detalles:</strong></p>
    <ul>
      <li><strong>Valor:</strong> ${valor} mg/dL</li>
      <li><strong>Fecha:</strong> ${fecha}</li>
      <li><strong>Hora:</strong> ${hora}</li>
      <li><strong>Observaciones durante la muestra:</strong> ${observaciones}</li>
    </ul>


    <p>Atentamente,<br>GlucoTracker</p>
  `
});

const getHiperTemplate = ({ nombrePaciente, valor, fecha, hora,observaciones }) => ({
  subject: `Alerta de Hiperglucemia - ${nombrePaciente}`,
  html: `
    <p>Estimado/a Doctor/a,</p>
    <p>Se registró una medición elevada de glucosa en el paciente <strong>${nombrePaciente}</strong>.</p>

    <p><strong>Detalles:</strong></p>
    <ul>
      <li><strong>Valor:</strong> ${valor} mg/dL</li>
      <li><strong>Fecha:</strong> ${fecha}</li>
      <li><strong>Hora:</strong> ${hora}</li>
      <li><strong>Observaciones durante la muestra:</strong> ${observaciones}</li>

    </ul>


    <p>Atentamente,<br>GlucoTracker</p>
  `
});


const getOtpTemplate = ({ nombreUsuario, codigo }) => ({
  subject: `Código de verificación para GlucoTracker`,
  html: `
    <p>Hola ${nombreUsuario},</p>
    <p>Tu código de verificación para completar el inicio de sesión es:</p>
    <h2>${codigo}</h2>
    <p>Este código expirará en 5 minutos.</p>
    <p>Si no solicitaste este código, ignora este correo.</p>
    <p>Atentamente,<br>GlucoTracker</p>
  `
});

module.exports = { getHipoTemplate, getHiperTemplate, getOtpTemplate };

