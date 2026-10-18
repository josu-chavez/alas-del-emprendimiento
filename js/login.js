
"use strict";

// Inicio de sesión de ALAS DEL EMPRENDIMIENTO
document.addEventListener("DOMContentLoaded", iniciarLogin);

async function iniciarLogin() {
    const modal = document.createElement("div");
    modal.id = "modalLogin";
    modal.className = "modal";
    modal.hidden = true;
    document.body.appendChild(modal);

    try {
        const respuesta = await fetch("componentes/login.html");

        if (!respuesta.ok) {
            throw new Error("No se pudo cargar el formulario de inicio de sesión.");
        }

        modal.innerHTML = await respuesta.text();
    } catch (error) {
        console.error("Error al cargar el inicio de sesión:", error);
        return;
    }

    const formulario = modal.querySelector("#formularioLogin");
    const mensaje = modal.querySelector("#mensajeLogin");
    const botonIngresar = modal.querySelector("#btnIniciarSesion");
    const campoCorreo = modal.querySelector("#correoLogin");
    const campoContrasena = modal.querySelector("#contrasenaLogin");

    function abrirLogin() {
        modal.hidden = false;
        mensaje.textContent = "";
        campoCorreo.focus();
    }

    function cerrarLogin() {
        modal.hidden = true;
    }

    // Funciones disponibles para otros archivos.
    window.abrirVentanaLogin = abrirLogin;
    window.cerrarVentanaLogin = cerrarLogin;

    
    // Actualizar los botones según la sesión actual.
    window.actualizarSesion = async function () {
        console.log("Actualizando cuenta...");
        const { data, error } = await supabaseClient.auth.getUser();

        if (error) {
            console.error("Error al comprobar la sesión:", error.message);
            return;
        }

        const usuario = data.user;
        const botonCuenta = document.getElementById("btnCuenta");
        const botonCuentaFooter = document.getElementById("btnCuentaFooter");

        console.log("Usuario detectado:", usuario);
        console.log("Botón encontrado:", botonCuenta);

        
        if (botonCuenta) {
            botonCuenta.textContent = usuario ? "👤 Mi cuenta" : "👤 Cuenta";
        }

        if (botonCuentaFooter) {
            botonCuentaFooter.textContent = usuario ? "👤 Mi cuenta" : "Mi cuenta";
        }

        // Abrir la página de cuenta al pulsar los botones.
        if (botonCuenta && !botonCuenta.dataset.eventoCuenta) {
            botonCuenta.dataset.eventoCuenta = "si";

            botonCuenta.addEventListener("click", () => {
                if (usuario) {
                    window.location.href = "cuenta.html";
                } else {
                    abrirLogin();
                }
            });
        }

        if (
            botonCuentaFooter &&
            !botonCuentaFooter.dataset.eventoCuenta
        ) {
            botonCuentaFooter.dataset.eventoCuenta = "si";

            botonCuentaFooter.addEventListener("click", () => {
                if (usuario) {
                    window.location.href = "cuenta.html";
                } else {
                    abrirLogin();
                }
            });
        }

    };

    // Mostrar el estado correcto al cargar la página.
    await window.actualizarSesion();

    // Actualizarlo también cuando cambie la sesión.
    
    // Usuario que tiene la sesión actual.
    let usuarioActual = null;

    // Actualizar los botones según el usuario.
    function actualizarBotonesCuenta(usuario) {
        usuarioActual = usuario || null;

        const botonCuenta = document.getElementById("btnCuenta");
        const botonCuentaFooter = document.getElementById("btnCuentaFooter");

        if (botonCuenta) {
            botonCuenta.textContent = usuarioActual
                ? "👤 Mi cuenta"
                : "👤 Cuenta";

            if (!botonCuenta.dataset.eventoCuenta) {
                botonCuenta.dataset.eventoCuenta = "si";

                botonCuenta.addEventListener("click", () => {
                    if (usuarioActual) {
                        window.location.href = "cuenta.html";
                    } else {
                        abrirLogin();
                    }
                });
            }
        }

        if (botonCuentaFooter) {
            botonCuentaFooter.textContent = usuarioActual
                ? "👤 Mi cuenta"
                : "Mi cuenta";

            if (!botonCuentaFooter.dataset.eventoCuenta) {
                botonCuentaFooter.dataset.eventoCuenta = "si";

                botonCuentaFooter.addEventListener("click", () => {
                    if (usuarioActual) {
                        window.location.href = "cuenta.html";
                    } else {
                        abrirLogin();
                    }
                });
            }
        }
    }

    // Consultar la sesión sin generar un error si no existe.
    window.actualizarSesion = async function () {
        console.log("Actualizando cuenta...");

        try {
            const { data, error } =
                await supabaseClient.auth.getSession();

            if (error) {
                console.error(
                    "Error al comprobar la sesión:",
                    error.message
                );
                return;
            }

            const usuario = data.session?.user || null;

            actualizarBotonesCuenta(usuario);

            console.log(
                usuario
                    ? "Sesión activa."
                    : "No hay una sesión iniciada."
            );
        } catch (error) {
            console.error(
                "Error al consultar la sesión:",
                error.message
            );
        }
    };

    // Detectar cambios de sesión sin volver a consultar
    // Supabase dentro de este evento.
    supabaseClient.auth.onAuthStateChange(
        (_evento, sesion) => {
            actualizarBotonesCuenta(sesion?.user || null);
        }
    );



    // Botones que pueden abrir el inicio de sesión.
    ["btnLogin", "btnIniciarSesion", "btnLoginFooter"].forEach((id) => {
        const boton = document.getElementById(id);

        if (boton && boton !== botonIngresar) {
            boton.addEventListener("click", abrirLogin);
        }
    });

    modal.querySelector("#cerrarLogin")
        .addEventListener("click", cerrarLogin);

    modal.addEventListener("click", (evento) => {
        if (evento.target === modal) {
            cerrarLogin();
        }
    });

    document.addEventListener("keydown", (evento) => {
        if (evento.key === "Escape") {
            cerrarLogin();
        }
    });

    
    // Enlace para abrir el registro.
let enlaceRegistro = formulario.querySelector(".login-registro");

if (!enlaceRegistro) {
    enlaceRegistro = document.createElement("p");
    enlaceRegistro.className = "login-registro";
    formulario.appendChild(enlaceRegistro);
}

enlaceRegistro.innerHTML = `
    ¿No tienes cuenta?
    <button type="button" id="irARegistro"
        style="cursor:pointer; color:#00eaff;
        background:transparent; border:none;
        text-decoration:underline; font:inherit;">
        Registrarme
    </button>
`;

const botonRegistro = enlaceRegistro.querySelector("#irARegistro");

botonRegistro.addEventListener("click", () => {
    cerrarLogin();

    if (typeof window.abrirVentanaRegistro === "function") {
        window.abrirVentanaRegistro();
    } else {
        console.error("No se encontró abrirVentanaRegistro");
        mostrarAviso("No se pudo abrir el registro. Recarga la página.");
    }
});

    // Procesar el inicio de sesión.
    formulario.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        if (typeof supabaseClient === "undefined") {
            mensaje.textContent = "No se pudo conectar con el servicio.";
            return;
        }

        const correo = campoCorreo.value.trim();
        const contrasena = campoContrasena.value;

        if (!correo || !contrasena) {
            mensaje.textContent = "Escribe tu correo y contraseña.";
            return;
        }

        botonIngresar.disabled = true;
        mensaje.textContent = "Iniciando sesión...";

        try {
            const { data, error } =
                await supabaseClient.auth.signInWithPassword({
                    email: correo,
                    password: contrasena
                });

            if (error) {
                throw error;
            }

            if (!data.user) {
                mensaje.textContent =
                    "No se pudo confirmar el inicio de sesión.";
                return;
            }

            mensaje.textContent = "¡Sesión iniciada correctamente!";

            window.dispatchEvent(
                new CustomEvent("sesion-iniciada", {
                    detail: { usuarioId: data.user.id }
                })
            );

            if (typeof window.actualizarSesion === "function") {
                await window.actualizarSesion();
            }

            cerrarLogin();

        } catch (error) {
            console.error("Error al iniciar sesión:", error.message);

            const detalle = (error.message || "").toLowerCase();

            if (detalle.includes("email not confirmed")) {
                mensaje.textContent =
                    "Debes confirmar tu correo antes de iniciar sesión.";
            } else if (
                detalle.includes("invalid login credentials")
            ) {
                mensaje.textContent =
                    "El correo o la contraseña son incorrectos.";
            } else {
                mensaje.textContent =
                    "No se pudo iniciar sesión. Revisa los datos e inténtalo nuevamente.";
            }
        } finally {
            botonIngresar.disabled = false;
        }
    });
}

// Mostrar avisos en la página.
function mostrarAviso(mensaje) {
    const aviso = document.getElementById("aviso");

    if (aviso) {
        aviso.textContent = mensaje;
        aviso.hidden = false;
    } else {
        console.log(mensaje);
    }
}
