
"use strict";

// Registro de usuarios de ALAS DEL EMPRENDIMIENTO
document.addEventListener("DOMContentLoaded", iniciarRegistro);

async function iniciarRegistro() {
    const modal = document.createElement("div");
    modal.id = "modalRegistro";
    modal.className = "modal";
    modal.hidden = true;
    document.body.appendChild(modal);

    try {
        const respuesta = await fetch("componentes/registro.html");

        if (!respuesta.ok) {
            throw new Error("No se pudo cargar el formulario de registro.");
        }

        modal.innerHTML = await respuesta.text();
        console.log("Formulario de registro cargado correctamente");
    } catch (error) {
        console.error("Error al cargar el registro:", error);
        return;
    }

    const formulario = modal.querySelector("#formularioRegistro");
    const mensaje = modal.querySelector("#mensajeRegistro");
    const botonRegistrar = modal.querySelector("#btnRegistrar");

    // Tipo de cuenta inicial.
    let tipoCuentaRegistro = "comprador";

    function abrirRegistro(tipo = "comprador") {
        tipoCuentaRegistro = tipo;
        modal.hidden = false;
        mensaje.textContent = "";
        modal.querySelector("#nombreRegistro").focus();
    }

    function cerrarRegistro() {
        modal.hidden = true;
        
    }
    
    // Permitir que login.js abra y cierre la ventana de registro.
    window.abrirVentanaRegistro = abrirRegistro;
    window.cerrarVentanaRegistro = cerrarRegistro;


    // Abrir el registro o la tienda según la sesión.
    ["btnCuenta", "btnCuentaFooter", "btnCrearTienda"].forEach((id) => {
        const boton = document.getElementById(id);

        if (!boton) return;

        boton.addEventListener("click", async () => {
            // Los botones normales abren el registro de comprador.
            if (id !== "btnCrearTienda") {
                abrirRegistro("comprador");
                return;
            }

            // Comprobar si el usuario ya inició sesión.
            try {
                if (typeof supabaseClient === "undefined") {
                    mostrarAviso("No se pudo conectar con el servicio.");
                    return;
                }

                const { data, error } =
                 await supabaseClient.auth.getSession();

                if (error) throw error;

                const usuario = data.session?.user;

                // Si ya tiene cuenta y sesión, abre el formulario de tienda.
                if (usuario) {
                    cerrarRegistro();

                    if (
                        typeof window.abrirVentanaTienda === "function"
                    ) {
                        window.abrirVentanaTienda();
                    } else {
                        mostrarAviso(
                            "No se pudo abrir la tienda. Recarga la página."
                        );
                    }

                    return;
                }

                // Si no tiene sesión, puede registrarse como vendedor.
                abrirRegistro("vendedor");
            } catch (error) {
                console.error(
                    "Error al comprobar la sesión:",
                    error.message
                );

                mostrarAviso(
                    "No se pudo comprobar tu sesión. Inténtalo nuevamente."
                );
            }
        });
    });

    // Botón para cerrar el formulario.
    modal.querySelector("#cerrarRegistro")
        .addEventListener("click", cerrarRegistro);

    // Cerrar al hacer clic fuera del formulario.
    modal.addEventListener("click", (evento) => {
        if (evento.target === modal) {
            cerrarRegistro();
        }
    });

    // Cerrar con la tecla Escape.
    document.addEventListener("keydown", (evento) => {
        if (evento.key === "Escape") {
            cerrarRegistro();
        }
    });

    // Enlace para abrir el inicio de sesión.
    const enlaceLogin = document.createElement("p");

    enlaceLogin.innerHTML =
        '¿Ya tienes cuenta? <button type="button" id="irALogin">Iniciar sesión</button>';

    formulario.appendChild(enlaceLogin);

    enlaceLogin.querySelector("#irALogin")
        .addEventListener("click", () => {
            cerrarRegistro();

            if (typeof window.abrirVentanaLogin === "function") {
                window.abrirVentanaLogin();
            } else {
                mostrarAviso(
                    "No se pudo abrir el inicio de sesión. Recarga la página."
                );

                console.error("No se encontró abrirVentanaLogin.");
            }
        });

    // Registrar usuario en Supabase.
    formulario.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        if (typeof supabaseClient === "undefined") {
            mensaje.textContent =
                "No se pudo conectar con el servicio.";
            return;
        }

        const nombre =
            modal.querySelector("#nombreRegistro").value.trim();

        const correo =
            modal.querySelector("#correoRegistro").value.trim();

        const telefono =
            modal.querySelector("#telefonoRegistro").value.trim();

        const contrasena =
            modal.querySelector("#contrasenaRegistro").value;

        if (!nombre || !correo || !telefono || !contrasena) {
            mensaje.textContent = "Completa todos los campos.";
            return;
        }

        if (contrasena.length < 8) {
            mensaje.textContent =
                "La contraseña debe tener al menos 8 caracteres.";
            return;
        }

        botonRegistrar.disabled = true;
        mensaje.textContent = "Creando tu cuenta...";

        try {
            const { data, error } = await supabaseClient.auth.signUp({
                email: correo,
                password: contrasena,
                options: {
                    data: {
                        nombre: nombre,
                        telefono: telefono,
                        tipo_cuenta: tipoCuentaRegistro
                    },
                    emailRedirectTo:
                        "http://127.0.0.1:5500/index.html"
                }
            });

            if (error) {
                throw error;
            }

            mensaje.textContent =
                "Cuenta creada como " +
                (tipoCuentaRegistro === "vendedor"
                    ? "vendedor"
                    : "comprador") +
                ". Revisa tu correo para confirmar el registro.";

            formulario.reset();

            console.log("Resultado del registro:", {
                usuarioCreado: Boolean(data.user),
                sesionIniciada: Boolean(data.session),
                tipoCuenta: tipoCuentaRegistro
            });
        } catch (error) {
            console.error("Error al registrar:", error.message);

            mensaje.textContent =
                interpretarErrorRegistro(error.message);
        } finally {
            botonRegistrar.disabled = false;
        }
    });
}

// Mostrar errores de registro en un lenguaje sencillo.
function interpretarErrorRegistro(mensaje) {
    const error = (mensaje || "").toLowerCase();

    if (
        error.includes("already registered") ||
        error.includes("already exists")
    ) {
        return "Este correo ya está registrado. Prueba con otro.";
    }

    if (error.includes("password")) {
        return "Revisa la contraseña. Debe cumplir los requisitos indicados.";
    }

    if (error.includes("email")) {
        return "Revisa el correo electrónico e inténtalo nuevamente.";
    }

    return "No se pudo crear la cuenta. Revisa los datos e inténtalo otra vez.";
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
