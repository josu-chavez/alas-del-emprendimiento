
"use strict";

document.addEventListener("DOMContentLoaded", iniciarMiTienda);

let tiendaActual = null;
let usuarioActual = null;
let archivoPortadaSeleccionado = null;
let portadaTemporal = null;

// ==========================================
// INICIAR EL PANEL
// ==========================================

async function iniciarMiTienda() {
    const formulario = document.getElementById("formularioEditarTienda");

    if (!formulario) return;

    if (typeof supabaseClient === "undefined" || !supabaseClient) {
        mostrarMensaje("No se pudo conectar con Supabase.", "error");
        return;
    }

    formulario.addEventListener("submit", guardarCambiosTienda);

    document.getElementById("editarPortada")
        ?.addEventListener("change", mostrarVistaPrevia);

    conectarBotonesPanel();

    window.addEventListener("producto-creado", () => {
        if (tiendaActual) cargarMisProductos();
    });

    try {
        const { data, error } = await supabaseClient.auth.getUser();

        if (error) throw error;

        usuarioActual = data.user;

        if (!usuarioActual) {
            mostrarMensaje(
                "Debes iniciar sesión para administrar tu tienda.",
                "error"
            );

            bloquearFormulario();
            mostrarSeccion("seccionAjustes");

            const botonPublicar = document.getElementById("btnAbrirPublicar");
            if (botonPublicar) botonPublicar.disabled = true;

            const enlace = document.createElement("a");
            enlace.href = "login.html";
            enlace.className = "btn-principal";
            enlace.textContent = "Iniciar sesión";
            enlace.style.display = "inline-block";

            document.getElementById("mensajeTienda")?.after(enlace);
            return;
        }

        await cargarMiTienda();

    } catch (error) {
        console.error("Error al iniciar el panel:", error);

        mostrarMensaje(
            error.message || "No se pudo cargar tu tienda.",
            "error"
        );
    }
}

// ==========================================
// BOTONES Y NAVEGACIÓN INTERNA
// ==========================================

function conectarBotonesPanel() {
    document.getElementById("btnAbrirPublicar")
        ?.addEventListener("click", () => {
            if (typeof window.abrirFormularioProducto === "function") {
                window.abrirFormularioProducto();
            } else {
                mostrarMensaje(
                    "No se encontró el formulario de publicación.",
                    "error"
                );
            }
        });

    document.getElementById("btnPublicarDesdeProductos")
        ?.addEventListener("click", () => {
            if (typeof window.abrirFormularioProducto === "function") {
                window.abrirFormularioProducto();
            } else {
                mostrarMensaje(
                    "No se encontró el formulario de publicación.",
                    "error"
                );
            }
        });

    document.getElementById("btnVerMisProductos")
        ?.addEventListener("click", async () => {
            mostrarSeccion("seccionMisProductos");
            await cargarMisProductos();
        });

    document.getElementById("btnVerFavoritos")
        ?.addEventListener("click", () => {
            mostrarSeccion("seccionFavoritos");
            mostrarMensajeFavoritos();
        });

    document.getElementById("btnVerMensajes")
        ?.addEventListener("click", () => {
            window.location.href = "cuenta.html";
        });

    document.getElementById("btnAbrirAjustes")
        ?.addEventListener("click", () => {
            mostrarSeccion("seccionAjustes");
        });

    document.getElementById("btnVolverDesdeProductos")
        ?.addEventListener("click", volverAlPanel);

    document.getElementById("btnVolverDesdeFavoritos")
        ?.addEventListener("click", volverAlPanel);

    document.getElementById("btnVolverDesdeMensajes")
        ?.addEventListener("click", volverAlPanel);

    document.getElementById("btnVolverDesdeAjustes")
        ?.addEventListener("click", volverAlPanel);

    document.getElementById("btnCerrarSesion")
        ?.addEventListener("click", cerrarSesion);
}

function volverAlPanel() {
    mostrarSeccion(null);
}

function mostrarSeccion(idSeccion) {
    const ids = [
        "menuTienda",
        "resumenTienda",
        "seccionMisProductos",
        "seccionFavoritos",
        "seccionMensajes",
        "seccionAjustes"
    ];

    ids.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.hidden = true;
    });

    if (!idSeccion) {
        document.getElementById("menuTienda").hidden = false;
        document.getElementById("resumenTienda").hidden = false;
        return;
    }

    const seccion = document.getElementById(idSeccion);
    if (seccion) seccion.hidden = false;
}

// ==========================================
// CARGAR LA TIENDA DEL USUARIO
// ==========================================

async function cargarMiTienda() {
    mostrarMensaje("Cargando los datos de tu tienda...", "exito");

    const { data: tiendas, error } = await supabaseClient
        .from("tiendas")
        .select(`
            id,
            usuario_id,
            nombre,
            descripcion,
            categoria,
            ubicacion,
            red_social,
            portada,
            portada_url,
            visitas,
            calificacion
        `)
        .eq("usuario_id", usuarioActual.id)
        .limit(1);

    if (error) throw error;

    if (!tiendas || tiendas.length === 0) {
        mostrarMensaje(
            "Todavía no tienes una tienda creada. Vuelve al inicio para crearla.",
            "error"
        );

        bloquearFormulario();
        mostrarSeccion("seccionAjustes");

        const enlace = document.createElement("a");
        enlace.href = "index.html";
        enlace.className = "btn-principal";
        enlace.textContent = "Volver al inicio";
        enlace.style.display = "inline-block";

        document.getElementById("mensajeTienda")?.after(enlace);
        return;
    }

    tiendaActual = tiendas[0];

    // Cargar datos en el formulario de ajustes.
    document.getElementById("editarNombre").value =
        tiendaActual.nombre || "";

    document.getElementById("editarDescripcion").value =
        tiendaActual.descripcion || "";

    document.getElementById("editarCategoria").value =
        tiendaActual.categoria || "";

    document.getElementById("editarUbicacion").value =
        tiendaActual.ubicacion || "";

    document.getElementById("editarRedSocial").value =
        tiendaActual.red_social || "";

    // Mostrar nombre y descripción del panel.
    document.getElementById("nombrePanelTienda").textContent =
        tiendaActual.nombre || "Mi emprendimiento";

    document.getElementById("descripcionPanelTienda").textContent =
        tiendaActual.descripcion || "Todavía no agregaste una descripción.";

    // Mostrar las visitas guardadas.
    document.getElementById("visitasPanelTienda").textContent =
        Number(tiendaActual.visitas) || 0;

    // Mostrar calificación solo si hay un valor real mayor que cero.
    const calificacion = Number(tiendaActual.calificacion);

    document.getElementById("calificacionPanelTienda").textContent =
        Number.isFinite(calificacion) && calificacion > 0
            ? "★ " + calificacion.toFixed(1) + " / 5"
            : "Sin calificaciones";

    // Mostrar la portada guardada.
    const portadaGuardada = tiendaActual.portada ||
        tiendaActual.portada_url || "";

    if (portadaGuardada) {
        const portadaPanel = document.getElementById("portadaPanelTienda");
        portadaPanel.src = portadaGuardada;
        portadaPanel.hidden = false;

        const vistaPrevia = document.getElementById(
            "vistaPreviaEditarPortada"
        );

        vistaPrevia.src = portadaGuardada;
        vistaPrevia.hidden = false;

        document.getElementById("sinPortada").hidden = true;
    } else {
        document.getElementById("portadaPanelTienda").hidden = true;
    }

    // Enlaces al perfil público.
    const urlPerfil = "perfil-tienda.html?" +
        new URLSearchParams({ id: tiendaActual.id }).toString();

    const enlacePerfil = document.getElementById("enlacePerfilPublico");
    enlacePerfil.href = urlPerfil;
    enlacePerfil.hidden = false;

    const enlaceAjustes = document.getElementById("enlacePerfilAjustes");
    enlaceAjustes.href = urlPerfil;

    mostrarSeccion(null);
    mostrarMensaje("Tu tienda se cargó correctamente.", "exito");
}

// ==========================================
// VISTA PREVIA DE LA PORTADA
// ==========================================

function mostrarVistaPrevia(evento) {
    const archivo = evento.target.files[0];

    archivoPortadaSeleccionado = null;

    if (portadaTemporal) {
        URL.revokeObjectURL(portadaTemporal);
        portadaTemporal = null;
    }

    if (!archivo) return;

    const tiposPermitidos = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (!tiposPermitidos.includes(archivo.type)) {
        mostrarMensaje("Selecciona una imagen JPG, PNG o WebP.", "error");
        evento.target.value = "";
        return;
    }

    if (archivo.size > 5 * 1024 * 1024) {
        mostrarMensaje("La imagen no debe superar los 5 MB.", "error");
        evento.target.value = "";
        return;
    }

    archivoPortadaSeleccionado = archivo;
    portadaTemporal = URL.createObjectURL(archivo);

    const imagen = document.getElementById("vistaPreviaEditarPortada");
    imagen.src = portadaTemporal;
    imagen.hidden = false;

    document.getElementById("sinPortada").hidden = true;

    mostrarMensaje(
        "Vista previa lista. Guarda los cambios para aplicar la portada.",
        "exito"
    );
}

// ==========================================
// GUARDAR CAMBIOS DE LA TIENDA
// ==========================================

async function guardarCambiosTienda(evento) {
    evento.preventDefault();

    if (!usuarioActual || !tiendaActual) {
        mostrarMensaje(
            "No se encontró tu tienda para guardar los cambios.",
            "error"
        );
        return;
    }

    const boton = document.getElementById("btnGuardarCambiosTienda");
    boton.disabled = true;
    boton.textContent = "Guardando cambios...";

    try {
        const nombre = document.getElementById("editarNombre").value.trim();
        const descripcion = document.getElementById("editarDescripcion").value.trim();
        const categoria = document.getElementById("editarCategoria").value;
        const ubicacion = document.getElementById("editarUbicacion").value.trim();
        const redSocial = document.getElementById("editarRedSocial").value.trim();

        if (!nombre) {
            throw new Error("Escribe el nombre de tu tienda.");
        }

        let portada = tiendaActual.portada ||
            tiendaActual.portada_url || null;

        if (archivoPortadaSeleccionado) {
            const extensiones = {
                "image/jpeg": "jpg",
                "image/png": "png",
                "image/webp": "webp"
            };

            const extension = extensiones[archivoPortadaSeleccionado.type];

            const rutaImagen = usuarioActual.id + "/" +
                crypto.randomUUID() + "." + extension;

            const { error: errorSubida } = await supabaseClient
                .storage
                .from("portadas-tiendas")
                .upload(rutaImagen, archivoPortadaSeleccionado, {
                    contentType: archivoPortadaSeleccionado.type,
                    upsert: false
                });

            if (errorSubida) throw errorSubida;

            const { data: imagenPublica } = supabaseClient
                .storage
                .from("portadas-tiendas")
                .getPublicUrl(rutaImagen);

            portada = imagenPublica.publicUrl;
        }

        const cambios = {
            nombre,
            descripcion,
            categoria,
            ubicacion,
            red_social: redSocial,
            portada
        };

        const { data, error } = await supabaseClient
            .from("tiendas")
            .update(cambios)
            .eq("id", tiendaActual.id)
            .eq("usuario_id", usuarioActual.id)
            .select(`
                id,
                usuario_id,
                nombre,
                descripcion,
                categoria,
                ubicacion,
                red_social,
                portada,
                portada_url,
                visitas,
                calificacion
            `)
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            throw new Error(
                "No se guardaron los cambios. Comprueba los permisos de Supabase."
            );
        }

        tiendaActual = data;
        archivoPortadaSeleccionado = null;

        if (portadaTemporal) {
            URL.revokeObjectURL(portadaTemporal);
            portadaTemporal = null;
        }

        document.getElementById("editarPortada").value = "";

        await cargarDatosActualizadosEnPanel();

        mostrarMensaje("¡Cambios guardados correctamente!", "exito");

    } catch (error) {
        console.error("Error al guardar la tienda:", error);
        mostrarMensaje(
            error.message || "No se pudieron guardar los cambios.",
            "error"
        );
    } finally {
        boton.disabled = false;
        boton.textContent = "Guardar cambios";
    }
}

async function cargarDatosActualizadosEnPanel() {
    document.getElementById("nombrePanelTienda").textContent =
        tiendaActual.nombre || "Mi emprendimiento";

    document.getElementById("descripcionPanelTienda").textContent =
        tiendaActual.descripcion || "Todavía no agregaste una descripción.";

    const portada = tiendaActual.portada || tiendaActual.portada_url || "";
    const imagen = document.getElementById("portadaPanelTienda");

    if (portada) {
        imagen.src = portada;
        imagen.hidden = false;
    } else {
        imagen.hidden = true;
    }

    const urlPerfil = "perfil-tienda.html?" +
        new URLSearchParams({ id: tiendaActual.id }).toString();

    document.getElementById("enlacePerfilPublico").href = urlPerfil;
    document.getElementById("enlacePerfilAjustes").href = urlPerfil;
}

// ==========================================
// MIS PRODUCTOS
// ==========================================

async function cargarMisProductos() {
    const contenedor = document.getElementById("listaMisProductos");

    if (!contenedor || !tiendaActual || !usuarioActual) return;

    contenedor.replaceChildren();

    const cargando = document.createElement("p");
    cargando.textContent = "Cargando tus productos...";
    contenedor.appendChild(cargando);

    try {
        const { data: productos, error } = await supabaseClient
            .from("productos")
            .select(`
                id,
                tienda_id,
                usuario_id,
                nombre,
                precio,
                cantidad,
                categoria,
                descripcion,
                imagen,
                creado_en
            `)
            .eq("tienda_id", tiendaActual.id)
            .eq("usuario_id", usuarioActual.id)
            .order("creado_en", { ascending: false });

        if (error) throw error;

        contenedor.replaceChildren();

        if (!productos || productos.length === 0) {
            const mensaje = document.createElement("p");
            mensaje.textContent = "Todavía no has publicado productos.";
            contenedor.appendChild(mensaje);
            return;
        }

        productos.forEach(producto => {
            const tarjeta = document.createElement("article");
            tarjeta.className = "tarjeta-mi-producto";

            if (producto.imagen) {
                const imagen = document.createElement("img");
                imagen.src = producto.imagen;
                imagen.alt = producto.nombre || "Producto";
                imagen.loading = "lazy";
                imagen.className = "imagen-mi-producto";
                tarjeta.appendChild(imagen);
            }

            const nombre = document.createElement("h3");
            nombre.textContent = producto.nombre || "Producto sin nombre";
            tarjeta.appendChild(nombre);

            const precio = document.createElement("p");
            precio.textContent = "Precio: Bs " +
                Number(producto.precio).toLocaleString("es-BO", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
            tarjeta.appendChild(precio);

            const cantidad = document.createElement("p");
            cantidad.textContent = "Cantidad disponible: " +
                (Number(producto.cantidad) || 0);
            tarjeta.appendChild(cantidad);

            const categoria = document.createElement("p");
            categoria.textContent = "Categoría: " +
                (producto.categoria || "Otros");
            tarjeta.appendChild(categoria);

            const botonVer = document.createElement("button");
            botonVer.type = "button";
            botonVer.className = "btn-principal";
            botonVer.textContent = "Ver producto";

            botonVer.addEventListener("click", () => {
                window.location.href = "detalle-producto.html?" +
                    new URLSearchParams({ id: producto.id }).toString();
            });

            tarjeta.appendChild(botonVer);

            const botonEliminar = document.createElement("button");
            botonEliminar.type = "button";
            botonEliminar.className = "btn-secundario";
            botonEliminar.textContent = "Eliminar producto";

            botonEliminar.addEventListener("click", () => {
                eliminarProducto(producto, botonEliminar);
            });

            tarjeta.appendChild(botonEliminar);
            contenedor.appendChild(tarjeta);
        });

    } catch (error) {
        console.error("Error al cargar los productos:", error);
        contenedor.replaceChildren();

        const mensaje = document.createElement("p");
        mensaje.textContent =
            error.message || "No se pudieron cargar tus productos.";
        contenedor.appendChild(mensaje);
    }
}

async function eliminarProducto(producto, boton) {
    const confirmar = window.confirm(
        "¿Seguro que quieres eliminar el producto " + producto.nombre + "?"
    );

    if (!confirmar) return;

    boton.disabled = true;
    boton.textContent = "Eliminando...";

    try {
        const { data, error } = await supabaseClient
            .from("productos")
            .delete()
            .eq("id", producto.id)
            .eq("tienda_id", tiendaActual.id)
            .eq("usuario_id", usuarioActual.id)
            .select("id");

        if (error) throw error;

        if (!data || data.length === 0) {
            throw new Error(
                "No se eliminó el producto. Comprueba los permisos de Supabase."
            );
        }

        mostrarMensaje("Producto eliminado correctamente.", "exito");
        await cargarMisProductos();

        window.dispatchEvent(new CustomEvent("producto-creado"));

    } catch (error) {
        console.error("Error al eliminar el producto:", error);
        mostrarMensaje(
            error.message || "No se pudo eliminar el producto.",
            "error"
        );

        boton.disabled = false;
        boton.textContent = "Eliminar producto";
    }
}

// ==========================================
// FAVORITOS (PENDIENTE DE CONECTAR)
// ==========================================

function mostrarMensajeFavoritos() {
    const mensaje = document.getElementById("mensajeFavoritos");

    if (mensaje) {
        mensaje.textContent =
            "La sección de favoritos necesita un sistema para guardar los productos que te gustan. La conectaremos en un siguiente paso.";
    }
}

// ==========================================
// CERRAR SESIÓN
// ==========================================

async function cerrarSesion() {
    const boton = document.getElementById("btnCerrarSesion");

    if (!window.confirm("¿Seguro que quieres cerrar sesión?")) return;

    if (boton) {
        boton.disabled = true;
        boton.textContent = "Cerrando sesión...";
    }

    try {
        const { error } = await supabaseClient.auth.signOut();

        if (error) throw error;

        window.location.href = "login.html";

    } catch (error) {
        console.error("Error al cerrar sesión:", error);
        mostrarMensaje(
            error.message || "No se pudo cerrar la sesión.",
            "error"
        );

        if (boton) {
            boton.disabled = false;
            boton.textContent = "Cerrar sesión";
        }
    }
}

// ==========================================
// UTILIDADES
// ==========================================

function bloquearFormulario() {
    const formulario = document.getElementById("formularioEditarTienda");

    formulario?.querySelectorAll("input, textarea, select, button")
        .forEach(elemento => {
            elemento.disabled = true;
        });
}

function mostrarMensaje(mensaje, tipo) {
    const elemento = document.getElementById("mensajeTienda");

    if (!elemento) return;

    elemento.textContent = mensaje;
    elemento.className = "mensaje-panel " + tipo;
    elemento.hidden = false;
}
