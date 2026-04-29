// Template correo Alerta: Hipoglucemia para el paciente
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
//  Template correo Alerta: Hiperglucemia para el paciente
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

// Template correo Codigo: Codigo de Verificación 2 pasos 
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

// Template correo Codigo: Recuperación y cambio de contraseña
const getRecuperacionTemplate = ({ nombreUsuario, codigo }) => ({
  subject: `Código para recuperar/cambiar contraseña - GlucoTracker`,
  html: `
    <p>Hola ${nombreUsuario},</p>
    <p>Has solicitado recuperar o cambiar tu contraseña. Tu código de verificación es:</p>
    <h2>${codigo}</h2>
    <p>Este código expirará en 10 minutos.</p>
    <p>Si no solicitaste este cambio, por favor ignora este correo y asegúrate de que tu cuenta esté segura.</p>
    <p>Atentamente,<br>GlucoTracker</p>
  `
});

// Template correo Codigo: Desbloqueo de cuenta
const getDesbloqueoTemplate = ({ nombreUsuario, codigo }) => ({
  subject: `Código para desbloquear cuenta - GlucoTracker`,
  html: `
    <p>Hola ${nombreUsuario},</p>
    <p>Tu cuenta ha sido bloqueada por múltiples intentos fallidos de inicio de sesión. Tu código de verificación para desbloquearla es:</p>
    <h2>${codigo}</h2>
    <p>Este código expirará en 15 minutos.</p>
    <p>Si no intentaste iniciar sesión, te recomendamos cambiar tu contraseña lo antes posible.</p>
    <p>Atentamente,<br>GlucoTracker</p>
  `
});

module.exports = { getHipoTemplate, getHiperTemplate, getOtpTemplate, getRecuperacionTemplate, getDesbloqueoTemplate };
const getWelcomeAdminTemplate = ({ nombreAdmin, correo, contrasena }) => ({
  subject: `Bienvenido al equipo de GlucoTracker - Tus credenciales`,
  html: `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <h2>¡Bienvenido/a, ${nombreAdmin}!</h2>
      <p>Has sido registrado exitosamente como personal de <strong>Soporte</strong> en la plataforma GlucoTracker.</p>
      <p>A continuación, te proporcionamos tus credenciales de acceso iniciales:</p>
      <div style="background-color: #f4f4f4; padding: 15px; border-radius: 8px; border: 1px solid #ddd;">
        <p><strong>Usuario:</strong> ${correo}</p>
        <p><strong>Contraseña temporal:</strong> ${contrasena}</p>
      </div>
      <p style="margin-top: 20px;">Por seguridad, te recomendamos cambiar tu contraseña una vez que hayas ingresado al sistema.</p>
     
      <br>
      <p>Atentamente,<br>Equipo de Administración de GlucoTracker</p>
    </div>
  `
});
module.exports = { getHipoTemplate, getHiperTemplate, getOtpTemplate, getOtpTemplate,getWelcomeAdminTemplate };

