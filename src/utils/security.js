const esContrasenaRobusta = (contrasena) => {
    if (!contrasena) {
        return { valida: false, mensaje: 'La contraseña es requerida.' };
    }

    if (contrasena.length < 12) {
        return { valida: false, mensaje: 'La contraseña debe tener al menos 12 caracteres.' };
    }

    const tieneMayuscula = /[A-Z]/.test(contrasena);
    const tieneMinuscula = /[a-z]/.test(contrasena);
    const tieneEspecial = /[!@#$%^&*(),.?":{}|<>\-_]/.test(contrasena);

    if (!tieneMayuscula) {
        return { valida: false, mensaje: 'La contraseña debe contener al menos una letra mayúscula.' };
    }

    if (!tieneMinuscula) {
        return { valida: false, mensaje: 'La contraseña debe contener al menos una letra minúscula.' };
    }

    if (!tieneEspecial) {
        return { valida: false, mensaje: 'La contraseña debe contener al menos un carácter especial.' };
    }

    return { valida: true, mensaje: 'Contraseña válida.' };
};

module.exports = {
    esContrasenaRobusta
};
