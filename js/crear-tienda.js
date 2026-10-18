
"use strict";

// CREAR TIENDA - ALAS DEL EMPRENDIMIENTO

document.addEventListener("DOMContentLoaded", iniciarCreacionTienda);

async function iniciarCreacionTienda() {
    // Crear la ventana de la tienda
    const modal = document.createElement("div");
    modal.id = "modalTienda";
    modal.className = "modal";
    modal.hidden = true;
    document.body.appendChild(modal);

    // Cargar el formulario existente
    try {
        const respuesta = await fetch("componentes/tienda.html");

        if (!respuesta.ok) {
            throw new Error("No se encontró componentes/tienda.html");
        }

        modal.innerHTML = await respuesta.text();
    } catch (error) {
        console.error("Error al cargar el formulario:", error);
        return;
    }

    const formulario = modal.querySelector("#formularioTienda");
    const mensaje = modal.querySelector("#mensajeTienda");
    const botonGuardar = modal.querySelector("#btnGuardarTienda");
    const botonCerrar = modal.querySelector("#cerrarTienda");

    // Abrir la ventana
    window.abrirVentanaTienda = function () {
        modal.hidden = false;
        mensaje.textContent = "";
    };

    // Cerrar la ventana
    function cerrarVentana() {
        modal.hidden = true;
    }

    botonCerrar.addEventListener("click", cerrarVentana);

    modal.addEventListener("click", function (evento) {
        if (evento.target === modal) {
            cerrarVentana();
        }
    });

    // Crear y guardar la tienda
    formulario.addEventListener("submit", async function (evento) {
        evento.preventDefault();

        if (typeof supabaseClient === "undefined") {
            mensaje.textContent = "No hay conexión con Supabase.";
            return;
        }

        botonGuardar.disabled = true;
        mensaje.textContent = "Comprobando tu cuenta...";

        try {
            // Comprobar la sesión del usuario
            const { data: sesionData, error: sesionError } =
                await supabaseClient.auth.getUser();

            if (sesionError) throw sesionError;

            const usuario = sesionData.user;

            if (!usuario) {
                mensaje.textContent =
                    "Debes iniciar sesión antes de crear tu tienda.";
                return;
            }

            // Leer los datos del formulario
            const nombre = formulario.querySelector("#nombreTienda")
                .value.trim();

            const descripcion =
                formulario.querySelector("#descripcionTienda")
                .value.trim();

            const categoria =
                formulario.querySelector("#categoriaTienda").value;

            const ubicacion =
                formulario.querySelector("#ubicacionTienda")
                .value.trim();

            const redSocial =
                formulario.querySelector("#redSocialTienda")
                .value.trim();

            if (!nombre || !descripcion || !categoria || !ubicacion) {
                mensaje.textContent =
                    "Completa todos los campos obligatorios.";
                return;
            }

            // Comprobar si el usuario ya tiene una tienda
            mensaje.textContent = "Comprobando si ya tienes una tienda...";

            const { data: tiendaExistente, error: consultaError } =
                await supabaseClient
                    .from("tiendas")
                    .select("id")
                    .eq("usuario_id", usuario.id)
                    .maybeSingle();

            if (consultaError) throw consultaError;

            if (tiendaExistente) {
                mensaje.textContent =
                    "Ya tienes una tienda creada. No puedes crear otra.";
                return;
            }

            // Guardar la nueva tienda
            mensaje.textContent = "Creando tu tienda...";

            const { data: nuevaTienda, error: crearError } =
                await supabaseClient
                    .from("tiendas")
                    .insert({
                        usuario_id: usuario.id,
                        nombre: nombre,
                        descripcion: descripcion,
                        categoria: categoria,
                        ubicacion: ubicacion,
                        red_social: redSocial || null
                    })
                    .select()
                    .single();

            if (crearError) throw crearError;

            mensaje.textContent =
                "¡Tu tienda se creó correctamente! 🪽";

            console.log("Tienda creada:", nuevaTienda);

            formulario.reset();

            // Avisar a la página que hay una tienda nueva
            document.dispatchEvent(new Event("tienda-creada"));

            // Cerrar la ventana después de un momento
            setTimeout(cerrarVentana, 1500);

        } catch (error) {
            console.error("Error al crear la tienda:", error);

            mensaje.textContent =
                "No se pudo crear la tienda. Revisa la conexión y los permisos de Supabase.";
        } finally {
            botonGuardar.disabled = false;
        }
    });
}
