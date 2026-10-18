
"use strict";

console.log("MI-TIENDA.JS SE ESTÁ EJECUTANDO");

document.addEventListener("DOMContentLoaded", iniciarMiTienda);

let tiendaActual = null;
let usuarioActual = null;
let archivoPortadaSeleccionado = null;
let portadaTemporal = null;
let conversacionActualId = null;

// ======================================================
// INICIO DEL PANEL
// ======================================================

async function iniciarMiTienda() {
    const contenedorChat = document.querySelector(".chat-contenedor");

    if (contenedorChat) {
        contenedorChat.classList.remove("mostrando-chat");
    }

    const formulario = document.getElementById("formularioEditarTienda");

    if (
        !formulario ||
        typeof supabaseClient === "undefined" ||
        !supabaseClient
    ) {
        console.error(
            "No se encontró el formulario de edición o la conexión con Supabase."
        );
        mostrarMensaje("No se pudo conectar con Supabase.", "error");
        return;
    }

    formulario.addEventListener("submit", guardarCambiosTienda);

    const selectorPortada = document.getElementById("editarPortada");

    if (selectorPortada) {
        selectorPortada.addEventListener("change", mostrarVistaPrevia);
    }

    conectarBotonesPanel();

    try {
        const { data, error } = await supabaseClient.auth.getUser();

        if (error) throw error;

        usuarioActual = data.user;

        if (!usuarioActual) {
            mostrarMensaje(
                "Inicia sesión para administrar tu tienda.",
                "error"
            );
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

// ======================================================
// CARGAR LA TIENDA DEL VENDEDOR
// ======================================================

async function cargarMiTienda() {
    const { data: tiendas, error } = await supabaseClient
        .from("tiendas")
        .select(
            "id, usuario_id, nombre, descripcion, categoria, ubicacion, red_social, whatsapp, portada, portada_url, visitas, calificacion"
        )
        .eq("usuario_id", usuarioActual.id)
        .limit(1);

    if (error) throw error;

    if (!tiendas || tiendas.length === 0) {
        tiendaActual = null;
        mostrarMensaje(
            "No encontramos una tienda asociada a tu cuenta.",
            "error"
        );
        return;
    }

    tiendaActual = tiendas[0];

    const asignaciones = {
        editarNombre: tiendaActual.nombre,
        editarDescripcion: tiendaActual.descripcion,
        editarCategoria: tiendaActual.categoria,
        editarUbicacion: tiendaActual.ubicacion,
        editarRedSocial: tiendaActual.red_social,
        editarWhatsapp: tiendaActual.whatsapp
    };

    Object.entries(asignaciones).forEach(([id, valor]) => {
        const elemento = document.getElementById(id);

        if (elemento) {
            elemento.value = valor || "";
        }
    });

    const nombrePanel = document.getElementById("nombrePanelTienda");
    const descripcionPanel = document.getElementById("descripcionPanelTienda");
    const visitasPanel = document.getElementById("visitasPanelTienda");
    const calificacionPanel = document.getElementById("calificacionPanelTienda");

    if (nombrePanel) {
        nombrePanel.textContent =
            tiendaActual.nombre || "Mi emprendimiento";
    }

    if (descripcionPanel) {
        descripcionPanel.textContent =
            tiendaActual.descripcion || "Todavía no hay una descripción.";
    }

    if (visitasPanel) {
        visitasPanel.textContent = Number(tiendaActual.visitas || 0);
    }

    if (calificacionPanel) {
        const calificacion = Number(tiendaActual.calificacion || 0);

        calificacionPanel.textContent =
            calificacion > 0
                ? `★ ${calificacion.toFixed(1)} / 5`
                : "Sin calificaciones";
    }

    const portada = tiendaActual.portada || tiendaActual.portada_url;
    const imagen = document.getElementById("portadaPanelTienda");

    if (imagen) {
        imagen.onerror = () => {
            imagen.hidden = true;
            console.warn("No se pudo cargar la portada.");
        };

        if (portada) {
            imagen.src = portada;
            imagen.hidden = false;
        } else {
            imagen.removeAttribute("src");
            imagen.hidden = true;
        }
    }

    const urlPerfil =
        "perfil-tienda.html?" +
        new URLSearchParams({ id: tiendaActual.id }).toString();

    const enlacePerfil = document.getElementById("enlacePerfilPublico");
    const enlaceAjustes = document.getElementById("enlacePerfilAjustes");

    if (enlacePerfil) {
        enlacePerfil.href = urlPerfil;
        enlacePerfil.hidden = false;
    }

    if (enlaceAjustes) {
        enlaceAjustes.href = urlPerfil;
    }

    mostrarMensaje("Tu tienda se cargó correctamente.", "exito");
}

// ======================================================
// BOTONES Y NAVEGACIÓN DEL PANEL
// ======================================================

function conectarBotonesPanel() {
    const alHacerClic = (id, funcion) => {
        const elemento = document.getElementById(id);

        if (elemento) {
            elemento.addEventListener("click", funcion);
        }
    };

    alHacerClic("btnAbrirPublicar", abrirPublicacion);
    alHacerClic("btnPublicarDesdeProductos", abrirPublicacion);
    alHacerClic("btnVerMisProductos", cargarMisProductos);
    alHacerClic("btnVerFavoritos", cargarMisFavoritos);
    alHacerClic("btnVerMensajes", cargarConversaciones);
    alHacerClic("btnActualizarConversaciones", cargarConversaciones);
    alHacerClic("btnVaciarConversacion", vaciarConversacionParaMi);

    alHacerClic("btnAbrirAjustes", () => {
        mostrarSeccion("seccionAjustes");
    });

    alHacerClic("btnVolverDesdeProductos", volverAlPanel);
    alHacerClic("btnVolverDesdeFavoritos", volverAlPanel);
    alHacerClic("btnVolverDesdeMensajes", volverAlPanel);
    alHacerClic("btnVolverDesdeAjustes", volverAlPanel);
    alHacerClic("btnCerrarSesion", cerrarSesion);

    const formularioChat = document.getElementById("formularioEnviarMensaje");

    if (formularioChat) {
        formularioChat.addEventListener("submit", enviarMensajeChat);
    }

    document.addEventListener("producto-creado", () => {
        if (tiendaActual) {
            cargarMisProductos();
        }
    });
}

function mostrarSeccion(id) {
    const resumen = document.getElementById("resumenTienda");
    const menu = document.getElementById("menuTienda");

    if (resumen) resumen.hidden = true;
    if (menu) menu.hidden = true;

    [
        "seccionMisProductos",
        "seccionFavoritos",
        "seccionMensajes",
        "seccionAjustes"
    ].forEach((seccionId) => {
        const elemento = document.getElementById(seccionId);

        if (elemento) {
            elemento.hidden = seccionId !== id;
        }
    });
}

function volverAlPanel() {
    [
        "seccionMisProductos",
        "seccionFavoritos",
        "seccionMensajes",
        "seccionAjustes"
    ].forEach((id) => {
        const elemento = document.getElementById(id);

        if (elemento) {
            elemento.hidden = true;
        }
    });

    const resumen = document.getElementById("resumenTienda");
    const menu = document.getElementById("menuTienda");

    if (resumen) resumen.hidden = false;
    if (menu) menu.hidden = false;
}

function abrirPublicacion() {
    if (typeof window.abrirFormularioProducto === "function") {
        window.abrirFormularioProducto();
    } else {
        mostrarMensaje(
            "No se encontró el formulario de productos. Revisa js/productos.js.",
            "error"
        );
    }
}

// ======================================================
// MIS PRODUCTOS
// ======================================================

async function cargarMisProductos() {
    mostrarSeccion("seccionMisProductos");

    const lista = document.getElementById("listaMisProductos");

    if (!lista) return;

    lista.replaceChildren();

    if (!tiendaActual || !usuarioActual) {
        lista.textContent = "No se encontró tu tienda o tu sesión.";
        return;
    }

    lista.textContent = "Cargando tus productos...";

    try {
        const { data: productos, error } = await supabaseClient
            .from("productos")
            .select(
                "id, tienda_id, usuario_id, nombre, precio, cantidad, categoria, descripcion, imagen"
            )
            .eq("tienda_id", tiendaActual.id)
            .eq("usuario_id", usuarioActual.id)
            .order("creado_en", { ascending: false });

        if (error) throw error;

        lista.replaceChildren();

        if (!productos || productos.length === 0) {
            lista.textContent =
                "Todavía no hay productos publicados en esta tienda.";
            return;
        }

        productos.forEach((producto) => {
            const tarjeta = document.createElement("article");
            tarjeta.className = "tarjeta-mi-producto";

            if (producto.imagen) {
                const imagen = document.createElement("img");
                imagen.src = producto.imagen;
                imagen.alt = producto.nombre || "Producto";
                imagen.loading = "lazy";

                imagen.onerror = () => {
                    imagen.hidden = true;
                };

                tarjeta.appendChild(imagen);
            }

            const nombre = document.createElement("h3");
            nombre.textContent = producto.nombre || "Producto sin nombre";

            const precio = document.createElement("p");
            precio.textContent =
                `Precio: Bs ${Number(producto.precio || 0).toFixed(2)}`;

            const cantidad = document.createElement("p");
            cantidad.textContent =
                `Stock: ${Number(producto.cantidad || 0)}`;

            const categoria = document.createElement("p");
            categoria.textContent =
                `Categoría: ${producto.categoria || "Sin categoría"}`;

            const eliminar = document.createElement("button");
            eliminar.type = "button";
            eliminar.className = "btn-secundario";
            eliminar.textContent = "Eliminar producto";

            eliminar.addEventListener("click", () => {
                eliminarProducto(producto.id);
            });

            tarjeta.append(
                nombre,
                precio,
                cantidad,
                categoria,
                eliminar
            );

            lista.appendChild(tarjeta);
        });
    } catch (error) {
        console.error("Error al cargar productos:", error);
        lista.textContent =
            "No se pudieron cargar los productos. Revisa la consola.";
    }
}

async function eliminarProducto(id) {
    if (!usuarioActual || !tiendaActual || !id) {
        mostrarMensaje("No se pudo verificar el producto.", "error");
        return;
    }

    if (!confirm("¿Seguro que deseas eliminar este producto de tu tienda?")) {
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from("productos")
            .delete()
            .eq("id", id)
            .eq("tienda_id", tiendaActual.id)
            .eq("usuario_id", usuarioActual.id)
            .select("id");

        if (error) throw error;

        if (!data || data.length === 0) {
            throw new Error(
                "No se eliminó el producto. Comprueba los permisos de Supabase."
            );
        }

        mostrarMensaje("Producto eliminado de la tienda.", "exito");
        await cargarMisProductos();
    } catch (error) {
        console.error("Error al eliminar producto:", error);
        mostrarMensaje(
            error.message || "No se pudo eliminar el producto.",
            "error"
        );
    }
}

// ======================================================
// FAVORITOS
// ======================================================

async function cargarMisFavoritos() {
    mostrarSeccion("seccionFavoritos");

    const lista = document.getElementById("listaFavoritos");
    const mensaje = document.getElementById("mensajeFavoritos");

    if (!lista || !mensaje) return;

    lista.replaceChildren();
    mensaje.hidden = false;
    mensaje.textContent = "Cargando tus favoritos...";

    try {
        if (!usuarioActual) {
            throw new Error("Inicia sesión para consultar tus favoritos.");
        }

        const { data: favoritos, error: errorFavoritos } =
            await supabaseClient
                .from("favoritos")
                .select("producto_id")
                .eq("usuario_id", usuarioActual.id);

        if (errorFavoritos) throw errorFavoritos;

        const ids = (favoritos || []).map((f) => f.producto_id);

        if (ids.length === 0) {
            mensaje.textContent =
                "Todavía no tienes productos favoritos. ❤️";
            return;
        }

        const { data: productos, error: errorProductos } =
            await supabaseClient
                .from("productos")
                .select(
                    "id, nombre, precio, cantidad, categoria, descripcion, imagen"
                )
                .in("id", ids);

        if (errorProductos) throw errorProductos;

        if (!productos || productos.length === 0) {
            mensaje.textContent =
                "Los productos guardados ya no están disponibles.";
            return;
        }

        mensaje.hidden = true;

        productos.forEach((producto) => {
            const tarjeta = document.createElement("article");
            tarjeta.className = "producto-tarjeta";

            if (producto.imagen) {
                const imagen = document.createElement("img");
                imagen.className = "producto-imagen";
                imagen.src = producto.imagen;
                imagen.alt = producto.nombre || "Producto";
                imagen.loading = "lazy";

                imagen.onerror = () => {
                    imagen.hidden = true;
                };

                tarjeta.appendChild(imagen);
            }

            const informacion = document.createElement("div");
            informacion.className = "producto-informacion";

            const nombre = document.createElement("h3");
            nombre.textContent = producto.nombre || "Producto";

            const precio = document.createElement("p");
            precio.className = "producto-precio";
            precio.textContent =
                `Bs ${Number(producto.precio || 0).toFixed(2)}`;

            const categoria = document.createElement("p");
            categoria.textContent =
                `Categoría: ${producto.categoria || "Sin categoría"}`;

            const botonQuitar = document.createElement("button");
            botonQuitar.type = "button";
            botonQuitar.className = "btn-secundario";
            botonQuitar.textContent = "♥ Quitar de favoritos";

            botonQuitar.addEventListener("click", async () => {
                botonQuitar.disabled = true;

                try {
                    const { error } = await supabaseClient
                        .from("favoritos")
                        .delete()
                        .eq("usuario_id", usuarioActual.id)
                        .eq("producto_id", producto.id);

                    if (error) throw error;

                    tarjeta.remove();

                    if (lista.children.length === 0) {
                        mensaje.hidden = false;
                        mensaje.textContent =
                            "Todavía no tienes productos favoritos. ❤️";
                    }

                    if (typeof window.cargarFavoritos === "function") {
                        await window.cargarFavoritos();
                    }
                } catch (error) {
                    console.error("Error al quitar favorito:", error);
                    mostrarMensaje(
                        "No se pudo quitar el producto de favoritos.",
                        "error"
                    );
                    botonQuitar.disabled = false;
                }
            });

            informacion.append(nombre, precio, categoria, botonQuitar);
            tarjeta.appendChild(informacion);
            lista.appendChild(tarjeta);
        });
    } catch (error) {
        console.error("Error al cargar favoritos:", error);
        mensaje.hidden = false;
        mensaje.textContent =
            error.message || "No se pudieron cargar tus favoritos.";
    }
}

// ======================================================
// PORTADA DE LA TIENDA
// ======================================================

function mostrarVistaPrevia(evento) {
    const archivo = evento.target.files?.[0];

    archivoPortadaSeleccionado = null;

    if (portadaTemporal) {
        URL.revokeObjectURL(portadaTemporal);
        portadaTemporal = null;
    }

    if (!archivo) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(archivo.type)) {
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
    const sinPortada = document.getElementById("sinPortada");

    if (imagen) {
        imagen.src = portadaTemporal;
        imagen.hidden = false;
    }

    if (sinPortada) {
        sinPortada.hidden = true;
    }
}

async function guardarCambiosTienda(evento) {
    evento.preventDefault();

    if (!usuarioActual || !tiendaActual) {
        mostrarMensaje(
            "No se encontró tu tienda para guardar cambios.",
            "error"
        );
        return;
    }

    const boton = document.getElementById("btnGuardarCambiosTienda");

    if (boton) boton.disabled = true;

    try {
        const obtenerValor = (id) =>
            document.getElementById(id)?.value?.trim() || "";

        const nombre = obtenerValor("editarNombre");
        const descripcion = obtenerValor("editarDescripcion");
        const categoria = document.getElementById("editarCategoria")?.value || "";
        const ubicacion = obtenerValor("editarUbicacion");
        const redSocial = obtenerValor("editarRedSocial");
        const whatsapp = obtenerValor("editarWhatsapp");

        if (!nombre || !categoria) {
            throw new Error("Escribe el nombre y selecciona una categoría.");
        }

        let portada = tiendaActual.portada || tiendaActual.portada_url || null;

        if (archivoPortadaSeleccionado) {
            const extension = {
                "image/jpeg": "jpg",
                "image/png": "png",
                "image/webp": "webp"
            }[archivoPortadaSeleccionado.type];

            const nombreArchivo =
                typeof crypto.randomUUID === "function"
                    ? crypto.randomUUID()
                    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

            const ruta = `${usuarioActual.id}/${nombreArchivo}.${extension}`;

            const { error: subidaError } = await supabaseClient.storage
                .from("portadas-tiendas")
                .upload(ruta, archivoPortadaSeleccionado, {
                    contentType: archivoPortadaSeleccionado.type,
                    upsert: false
                });

            if (subidaError) throw subidaError;

            const { data: urlImagen } = supabaseClient.storage
                .from("portadas-tiendas")
                .getPublicUrl(ruta);

            portada = urlImagen.publicUrl;
        }

        const { data, error } = await supabaseClient
            .from("tiendas")
            .update({
                nombre,
                descripcion,
                categoria,
                ubicacion,
                red_social: redSocial,
                whatsapp,
                portada
            })
            .eq("id", tiendaActual.id)
            .eq("usuario_id", usuarioActual.id)
            .select(
                "id, usuario_id, nombre, descripcion, categoria, ubicacion, red_social, whatsapp, portada, portada_url, visitas, calificacion"
            )
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            throw new Error(
                "No se guardaron los cambios. Comprueba los permisos de Supabase."
            );
        }

        tiendaActual = data;
        archivoPortadaSeleccionado = null;

        const selectorPortada = document.getElementById("editarPortada");

        if (selectorPortada) {
            selectorPortada.value = "";
        }

        if (portadaTemporal) {
            URL.revokeObjectURL(portadaTemporal);
            portadaTemporal = null;
        }

        await cargarMiTienda();

        mostrarMensaje(
            "Los cambios de tu tienda se guardaron correctamente.",
            "exito"
        );
    } catch (error) {
        console.error("Error al guardar la tienda:", error);
        mostrarMensaje(
            error.message || "No se pudieron guardar los cambios.",
            "error"
        );
    } finally {
        if (boton) boton.disabled = false;
    }
}

// ======================================================
// CERRAR SESIÓN Y MENSAJES DEL PANEL
// ======================================================

async function cerrarSesion() {
    try {
        const { error } = await supabaseClient.auth.signOut();

        if (error) throw error;

        window.location.href = "login.html";
    } catch (error) {
        mostrarMensaje(
            error.message || "No se pudo cerrar la sesión.",
            "error"
        );
    }
}

function mostrarMensaje(mensaje, tipo) {
    const elemento = document.getElementById("mensajeTienda");

    if (!elemento) {
        console.log(mensaje);
        return;
    }

    elemento.textContent = mensaje;
    elemento.className = `mensaje-panel ${tipo}`;
    elemento.hidden = false;
}

// ======================================================
// DATOS DE LA CONVERSACIÓN Y SUS PRODUCTOS
// ======================================================

async function obtenerDatosConversacion(id) {
    if (!usuarioActual || !id) {
        throw new Error("No se pudo verificar la conversación.");
    }

    const { data: participacion, error: errorParticipacion } =
        await supabaseClient
            .from("participantes_chat")
            .select("conversacion_id")
            .eq("conversacion_id", id)
            .eq("usuario_id", usuarioActual.id)
            .maybeSingle();

    if (errorParticipacion) throw errorParticipacion;

    if (!participacion) {
        throw new Error("No tienes acceso a esta conversación.");
    }

    const { data: participantes, error: errorParticipantes } =
        await supabaseClient.rpc("obtener_otro_participante", {
            p_conversacion_id: id
        });

    if (errorParticipantes) throw errorParticipantes;

    const otroParticipante = Array.isArray(participantes)
        ? participantes[0]
        : participantes;

    const { data: conversacion, error: errorConversacion } =
        await supabaseClient
            .from("conversaciones")
            .select("id, producto_id")
            .eq("id", id)
            .maybeSingle();

    if (errorConversacion) throw errorConversacion;

    if (!conversacion) {
        throw new Error("No se encontró la conversación.");
    }

    const idsProductos = new Set();

    if (conversacion.producto_id) {
        idsProductos.add(conversacion.producto_id);
    }

    const { data: relaciones, error: errorRelaciones } =
        await supabaseClient
            .from("conversacion_productos")
            .select("producto_id")
            .eq("conversacion_id", id);

    if (errorRelaciones) throw errorRelaciones;

    (relaciones || []).forEach((relacion) => {
        if (relacion.producto_id) {
            idsProductos.add(relacion.producto_id);
        }
    });

    let productos = [];

    if (idsProductos.size > 0) {
        const { data, error } = await supabaseClient
            .from("productos")
            .select(
                "id, nombre, precio, imagen, categoria, descripcion, cantidad"
            )
            .in("id", Array.from(idsProductos));

        if (error) throw error;

        productos = data || [];
    }

    productos.sort((a, b) => {
        if (a.id === conversacion.producto_id) return -1;
        if (b.id === conversacion.producto_id) return 1;
        return 0;
    });

    return {
        nombre:
            otroParticipante?.nombre ||
            otroParticipante?.nombre_completo ||
            otroParticipante?.correo ||
            "Usuario",
        producto: productos[0] || null,
        productos
    };
}

// ======================================================
// LISTA DE CONVERSACIONES DEL VENDEDOR
// ======================================================

async function cargarConversaciones() {
    mostrarSeccion("seccionMensajes");

    const lista = document.getElementById("listaConversaciones");
    const estado = document.getElementById("mensajeListaConversaciones");
    const mensajes = document.getElementById("listaMensajes");
    const botonVaciar = document.getElementById("btnVaciarConversacion");
    const titulo = document.getElementById("tituloChat");
    const estadoChat = document.getElementById("estadoChat");
    const campo = document.getElementById("contenidoMensaje");
    const botonEnviar = document.getElementById("btnEnviarMensaje");

    if (!lista || !estado || !mensajes) {
        console.error("Faltan elementos HTML del chat.");
        return;
    }

    lista.replaceChildren();
    mensajes.replaceChildren();
    conversacionActualId = null;

    if (botonVaciar) botonVaciar.disabled = true;

    limpiarProductoChat();

    if (titulo) titulo.textContent = "Selecciona una conversación";

    if (estadoChat) {
        estadoChat.textContent =
            "Abre una conversación para leer los mensajes.";
    }

    if (campo) campo.disabled = true;
    if (botonEnviar) botonEnviar.disabled = true;

    if (!usuarioActual) {
        estado.textContent = "Inicia sesión para ver tus conversaciones.";
        return;
    }

    estado.textContent = "Cargando conversaciones...";

    try {
        const { data: participaciones, error: errorParticipaciones } =
            await supabaseClient
                .from("participantes_chat")
                .select("conversacion_id")
                .eq("usuario_id", usuarioActual.id);

        if (errorParticipaciones) throw errorParticipaciones;

        const ids = [
            ...new Set(
                (participaciones || []).map((p) => p.conversacion_id)
            )
        ];

        if (ids.length === 0) {
            estado.textContent = "Todavía no tienes conversaciones.";
            return;
        }

        const { data: conversaciones, error: errorConversaciones } =
            await supabaseClient
                .from("conversaciones")
                .select("id, creado_en")
                .in("id", ids)
                .order("creado_en", { ascending: false });

        if (errorConversaciones) throw errorConversaciones;

        const { data: ultimosMensajes, error: errorMensajes } =
            await supabaseClient
                .from("mensajes")
                .select("conversacion_id, contenido, creado_en")
                .in("conversacion_id", ids)
                .order("creado_en", { ascending: false });

        if (errorMensajes) throw errorMensajes;

        const ultimoPorConversacion = new Map();

        (ultimosMensajes || []).forEach((mensaje) => {
            if (!ultimoPorConversacion.has(mensaje.conversacion_id)) {
                ultimoPorConversacion.set(mensaje.conversacion_id, mensaje);
            }
        });

        const { data: ocultas, error: errorOcultas } = await supabaseClient
            .from("conversaciones_ocultas")
            .select("conversacion_id")
            .eq("usuario_id", usuarioActual.id);

        if (errorOcultas) throw errorOcultas;

        const idsOcultos = new Set(
            (ocultas || []).map((item) => item.conversacion_id)
        );

        for (const conversacion of conversaciones || []) {
            const boton = document.createElement("button");
            boton.type = "button";
            boton.className = "chat-conversacion";
            boton.dataset.conversacionId = conversacion.id;

            const tituloConversacion = document.createElement("strong");
            tituloConversacion.textContent = "Cargando participante...";

            const productoTexto = document.createElement("p");
            productoTexto.textContent = idsOcultos.has(conversacion.id)
                ? "Conversación oculta para ti"
                : "Cargando productos...";

            const detalle = document.createElement("p");
            const ultimo = ultimoPorConversacion.get(conversacion.id);

            detalle.textContent = ultimo
                ? "Último mensaje: " +
                  String(ultimo.contenido || "").slice(0, 70)
                : "Todavía no hay mensajes.";

            boton.append(tituloConversacion, productoTexto, detalle);
            lista.appendChild(boton);

            boton.addEventListener("click", () => {
                abrirConversacionChat(conversacion.id, boton);
            });

            try {
                const datos = await obtenerDatosConversacion(conversacion.id);

                tituloConversacion.textContent = datos.nombre;

                if (idsOcultos.has(conversacion.id)) {
                    productoTexto.textContent = "Conversación oculta para ti";
                } else if (datos.productos.length > 0) {
                    productoTexto.textContent =
                        "Productos: " +
                        datos.productos
                            .map((producto) => producto.nombre || "Producto")
                            .join(", ");
                } else {
                    productoTexto.textContent = "Sin productos asociados";
                }
            } catch (errorDatos) {
                console.error(
                    "Error al cargar datos de la conversación:",
                    errorDatos
                );

                tituloConversacion.textContent = "Usuario";
                productoTexto.textContent =
                    "No se pudieron cargar los productos";
            }
        }

        estado.textContent = conversaciones?.length
            ? "Selecciona una conversación para responder."
            : "Todavía no tienes conversaciones.";
    } catch (error) {
        console.error("Error al cargar conversaciones:", error);
        estado.textContent =
            "No se pudieron cargar las conversaciones: " + error.message;
    }
}

// ======================================================
// MOSTRAR Y LIMPIAR PRODUCTOS DEL CHAT
// ======================================================

function limpiarProductoChat() {
    const bloque = document.getElementById("productoChat");
    const imagen = document.getElementById("imagenProductoChat");
    const nombre = document.getElementById("nombreProductoChat");
    const precio = document.getElementById("precioProductoChat");

    if (bloque) {
        bloque.hidden = true;

        bloque.querySelectorAll(
            ".producto-chat-dinamico, .producto-chat-adicional"
        ).forEach((elemento) => elemento.remove());
    }

    if (imagen) {
        imagen.hidden = true;
        imagen.removeAttribute("src");
        imagen.alt = "";
    }

    if (nombre) nombre.textContent = "";
    if (precio) precio.textContent = "";
}

function mostrarProductosChat(productos) {
    const bloque = document.getElementById("productoChat");
    const imagenPrincipal = document.getElementById("imagenProductoChat");
    const nombrePrincipal = document.getElementById("nombreProductoChat");
    const precioPrincipal = document.getElementById("precioProductoChat");
    console.log("MOSTRANDO PRODUCTOS EN EL CHAT:", productos);
    console.log("CONTENEDOR DEL PRODUCTO:", bloque);
    console.log("MOSTRANDO PRODUCTOS EN EL CHAT:", productos);
    console.log("CONTENEDOR DEL PRODUCTO:", bloque);

    if (!bloque) {
        console.error("No se encontró #productoChat en el HTML.");
        return;
    }

    limpiarProductoChat();

    if (!Array.isArray(productos) || productos.length === 0) {
        return;
    }

    const principal = productos[0];
    console.log("DATOS DEL PRODUCTO QUE SE MOSTRARÁ:", {
    nombre: principal.nombre,
    precio: principal.precio,
    imagen: principal.imagen,
    categoria: principal.categoria
});

    if (nombrePrincipal) {
        nombrePrincipal.textContent =
            principal.nombre || "Producto sin nombre";
    }

    if (precioPrincipal) {
        precioPrincipal.textContent =
            `Bs ${Number(principal.precio || 0).toFixed(2)}`;
    }

    if (imagenPrincipal) {
        const url = typeof principal.imagen === "string"
            ? principal.imagen.trim()
            : "";

        imagenPrincipal.onerror = () => {
            imagenPrincipal.hidden = true;
        };

        if (url) {
            imagenPrincipal.src = url;
            imagenPrincipal.alt = principal.nombre || "Producto";
            imagenPrincipal.hidden = false;
        } else {
            imagenPrincipal.removeAttribute("src");
            imagenPrincipal.hidden = true;
        }
    }

    bloque.hidden = false;

    bloque.style.display = "block";

console.log("ESTADO FINAL DEL CONTENEDOR:", {
    hidden: bloque.hidden,
    display: getComputedStyle(bloque).display,
    visibility: getComputedStyle(bloque).visibility
});

    const detalles = document.createElement("div");
    detalles.className =
        "chat-producto-detalles producto-chat-dinamico";

    const agregarDetalle = (etiqueta, valor) => {
        const parrafo = document.createElement("p");
        const etiquetaElemento = document.createElement("strong");

        etiquetaElemento.textContent = `${etiqueta}: `;
        parrafo.appendChild(etiquetaElemento);
        parrafo.appendChild(
            document.createTextNode(String(valor || "No especificado"))
        );

        detalles.appendChild(parrafo);
    };

    agregarDetalle("Categoría", principal.categoria);
    agregarDetalle("Descripción", principal.descripcion);
    agregarDetalle("Stock", Number(principal.cantidad || 0));

    bloque.appendChild(detalles);
    console.log("CONTENIDO FINAL DEL CHAT:", bloque.innerHTML);
console.log("¿SIGUE VISIBLE?:", {
    hidden: bloque.hidden,
    display: getComputedStyle(bloque).display,
    alto: bloque.getBoundingClientRect().height
});

    productos.slice(1).forEach((producto) => {
        const tarjeta = document.createElement("article");
        tarjeta.className =
            "producto-chat-adicional producto-chat-dinamico";

        if (producto.imagen) {
            const imagen = document.createElement("img");
            imagen.src = producto.imagen;
            imagen.alt = producto.nombre || "Producto";
            imagen.loading = "lazy";

            imagen.onerror = () => {
                imagen.hidden = true;
            };

            tarjeta.appendChild(imagen);
        }

        const nombre = document.createElement("strong");
        nombre.textContent = producto.nombre || "Producto sin nombre";

        const precio = document.createElement("p");
        precio.textContent =
            `Precio: Bs ${Number(producto.precio || 0).toFixed(2)}`;

        const categoria = document.createElement("p");
        categoria.textContent =
            `Categoría: ${producto.categoria || "Sin categoría"}`;

        const descripcion = document.createElement("p");
        descripcion.textContent =
            `Descripción: ${producto.descripcion || "Sin descripción"}`;

        const stock = document.createElement("p");
        stock.textContent = `Stock: ${Number(producto.cantidad || 0)}`;

        tarjeta.append(nombre, precio, categoria, descripcion, stock);
        bloque.appendChild(tarjeta);
    });
}

// ======================================================
// ABRIR UNA CONVERSACIÓN
// ======================================================

async function abrirConversacionChat(id, botonActivo) {
    if (!usuarioActual || !id) return;

    conversacionActualId = id;

    const botonVaciar = document.getElementById("btnVaciarConversacion");
    const titulo = document.getElementById("tituloChat");
    const estado = document.getElementById("estadoChat");
    const campo = document.getElementById("contenidoMensaje");
    const botonEnviar = document.getElementById("btnEnviarMensaje");
    const lista = document.getElementById("listaMensajes");
    const formularioMensaje = document.getElementById(
        "formularioEnviarMensaje"
    );

    if (!lista) {
        console.error("No se encontró la lista de mensajes.");
        return;
    }

    if (campo) campo.disabled = true;
    if (botonEnviar) botonEnviar.disabled = true;
    if (botonVaciar) botonVaciar.disabled = true;

    lista.replaceChildren();

    if (estado) estado.textContent = "Cargando conversación...";

    try {
        const datos = await obtenerDatosConversacion(id);

        if (conversacionActualId !== id) return;

        const { data: conversacionesOcultas, error: errorOcultas } =
            await supabaseClient
                .from("conversaciones_ocultas")
                .select("conversacion_id")
                .eq("usuario_id", usuarioActual.id)
                .eq("conversacion_id", id);

        if (errorOcultas) throw errorOcultas;

        const estaOculta = (conversacionesOcultas || []).length > 0;


        if (titulo) {
            titulo.textContent = datos.nombre || "Usuario";
        }

        limpiarProductoChat();

        if (estado) {
            estado.textContent = estaOculta
                ? "Conversación vaciada para ti."
                : "Selecciona un producto al que se refiera tu mensaje, si corresponde.";
        }

        const { data: mensajes, error: errorMensajes } =
            await supabaseClient
                .from("mensajes")
                .select("id, remitente_id, contenido, creado_en, producto_id")
                .eq("conversacion_id", id)
                .order("creado_en", { ascending: true });

        if (errorMensajes) throw errorMensajes;
        if (conversacionActualId !== id) return;

        const { data: ocultos, error: errorMensajesOcultos } =
            await supabaseClient
                .from("mensajes_ocultos")
                .select("mensaje_id")
                .eq("usuario_id", usuarioActual.id);

        if (errorMensajesOcultos) throw errorMensajesOcultos;

        if (conversacionActualId !== id) return;

        const idsOcultos = new Set(
            (ocultos || []).map((item) => item.mensaje_id)
        );

        const mensajesVisibles = (mensajes || []).filter(
            (mensaje) => !idsOcultos.has(mensaje.id)
        );

        // Relacionar cada producto con su identificador.
        const productosPorId = new Map(
            (datos.productos || []).map((producto) => [
                producto.id,
                producto
            ])
        );

        lista.replaceChildren();

        // Cada producto se muestra dentro del mensaje correspondiente.
        mensajesVisibles.forEach((mensaje) => {
            const esPropio = mensaje.remitente_id === usuarioActual.id;
            const tarjeta = document.createElement("article");

            tarjeta.className =
                "chat-mensaje " + (esPropio ? "propio" : "otro");

            tarjeta.dataset.mensajeId = mensaje.id;

            const texto = document.createElement("p");
            texto.className = "chat-mensaje-texto";
            texto.textContent = mensaje.contenido || "";

            tarjeta.appendChild(texto);

            const producto = mensaje.producto_id
                ? productosPorId.get(mensaje.producto_id)
                : null;

            if (producto) {
                const tarjetaProducto = document.createElement("div");
                tarjetaProducto.className = "chat-producto-mensaje";

                const encabezado = document.createElement("strong");
                encabezado.textContent = "Producto relacionado";

                const contenidoProducto = document.createElement("div");
                contenidoProducto.className =
                    "chat-producto-mensaje-contenido";

                if (producto.imagen) {
                    const imagen = document.createElement("img");
                    imagen.className = "chat-producto-imagen";
                    imagen.src = producto.imagen;
                    imagen.alt = producto.nombre || "Producto";
                    imagen.loading = "lazy";

                    imagen.onerror = () => {
                        imagen.hidden = true;
                    };

                    contenidoProducto.appendChild(imagen);
                }

                const informacion = document.createElement("div");

                const nombre = document.createElement("p");
                nombre.textContent = producto.nombre || "Producto";

                const precio = document.createElement("p");
                precio.textContent =
                    `Precio: Bs ${Number(producto.precio || 0).toFixed(2)}`;

                informacion.append(nombre, precio);
                contenidoProducto.appendChild(informacion);

                tarjetaProducto.append(encabezado, contenidoProducto);
                tarjeta.appendChild(tarjetaProducto);
            }

            const fecha = document.createElement("time");
            fecha.textContent = mensaje.creado_en
                ? new Date(mensaje.creado_en).toLocaleString("es-BO")
                : "";

            tarjeta.appendChild(fecha);

            // Opciones para administrar el mensaje.
            const opciones = document.createElement("div");
            opciones.className = "chat-opciones-mensaje";
            opciones.hidden = true;

            const botonMi = document.createElement("button");
            botonMi.type = "button";
            botonMi.textContent = "Eliminar para mí";

            botonMi.addEventListener("click", async (evento) => {
                evento.stopPropagation();
                botonMi.disabled = true;

                try {
                    await eliminarMensajeParaMi(mensaje.id);
                } finally {
                    botonMi.disabled = false;
                }
            });

            opciones.appendChild(botonMi);

            if (esPropio) {
                const botonTodos = document.createElement("button");
                botonTodos.type = "button";
                botonTodos.className = "btn-eliminar-todos";
                botonTodos.textContent = "Eliminar para todos";

                botonTodos.addEventListener("click", async (evento) => {
                    evento.stopPropagation();
                    botonTodos.disabled = true;

                    try {
                        await eliminarMensajeParaTodos(mensaje.id);
                    } finally {
                        botonTodos.disabled = false;
                    }
                });

                opciones.appendChild(botonTodos);
            }

            tarjeta.appendChild(opciones);

            const alternarOpciones = () => {
                const mostrar = opciones.hidden;

                document.querySelectorAll(".chat-opciones-mensaje").forEach(
                    (menu) => {
                        menu.hidden = true;
                    }
                );

                opciones.hidden = !mostrar;
            };

            tarjeta.addEventListener("contextmenu", (evento) => {
                evento.preventDefault();
                alternarOpciones();
            });

            let temporizador = null;
            let pulsacionLarga = false;

            tarjeta.addEventListener("pointerdown", (evento) => {
                if (evento.pointerType === "mouse") return;

                pulsacionLarga = false;

                temporizador = setTimeout(() => {
                    pulsacionLarga = true;
                    alternarOpciones();
                }, 550);
            });

            ["pointerup", "pointerleave", "pointercancel"].forEach((tipo) => {
                tarjeta.addEventListener(tipo, () => {
                    clearTimeout(temporizador);
                });
            });

            tarjeta.addEventListener("click", (evento) => {
                if (pulsacionLarga) {
                    evento.preventDefault();
                    evento.stopPropagation();
                    pulsacionLarga = false;
                }
            });

            lista.appendChild(tarjeta);
        });

        if (mensajesVisibles.length === 0 && estado) {
            estado.textContent = estaOculta
                ? "Conversación vaciada para ti."
                : "Todavía no hay mensajes visibles.";
        }

        if (campo) campo.disabled = estaOculta;
        if (botonEnviar) botonEnviar.disabled = estaOculta;
        if (botonVaciar) botonVaciar.disabled = false;

        lista.scrollTop = lista.scrollHeight;
    } catch (error) {
        console.error("Error al abrir conversación:", error);

        if (conversacionActualId === id && estado) {
            estado.textContent =
                "No se pudo abrir el chat: " + error.message;
        }

        if (campo) campo.disabled = true;
        if (botonEnviar) botonEnviar.disabled = true;
    }
}

// ======================================================
// ACTUALIZAR EL ÚLTIMO MENSAJE DE LA LISTA
// ======================================================

function cargarUltimoMensajeEnLista(id, contenido) {
    document.querySelectorAll(".chat-conversacion").forEach((boton) => {
        if (boton.dataset.conversacionId !== id) return;

        const detalles = boton.querySelectorAll("p");
        const ultimoMensaje = detalles[detalles.length - 1];

        if (ultimoMensaje) {
            ultimoMensaje.textContent =
                "Último mensaje: " + String(contenido || "").slice(0, 70);
        }
    });
}

// ======================================================
// ENVIAR MENSAJES
// ======================================================

async function enviarMensajeChat(evento) {
    evento.preventDefault();

    if (!usuarioActual || !conversacionActualId) {
        mostrarMensaje("Selecciona una conversación primero.", "error");
        return;
    }

    const campo = document.getElementById("contenidoMensaje");
    const boton = document.getElementById("btnEnviarMensaje");

    if (!campo || !boton) return;

    const contenido = campo.value.trim();

    if (!contenido) return;

    const id = conversacionActualId;
    boton.disabled = true;

    try {
        const { data: participacion, error: errorParticipacion } =
            await supabaseClient
                .from("participantes_chat")
                .select("conversacion_id")
                .eq("conversacion_id", id)
                .eq("usuario_id", usuarioActual.id)
                .maybeSingle();

        if (errorParticipacion) throw errorParticipacion;

        if (!participacion) {
            throw new Error("No tienes permiso para enviar mensajes aquí.");
        }

        
const { data: conversacion, error: errorConversacion } =
    await supabaseClient
        .from("conversaciones")
        .select("producto_id")
        .eq("id", id)
        .maybeSingle();

if (errorConversacion) throw errorConversacion;

if (!conversacion) {
    throw new Error("No se encontró la conversación.");
}


const productoIdSeleccionado = conversacion.producto_id || null;
    console.log(
    "PRODUCTO SELECCIONADO:",
    productoIdSeleccionado
);

// Verificar que el producto seleccionado pertenezca al chat.
if (productoIdSeleccionado) {
    const { data: relacion, error: errorRelacion } =
        await supabaseClient
            .from("conversacion_productos")
            .select("producto_id")
            .eq("conversacion_id", id)
            .eq("producto_id", productoIdSeleccionado)
            .maybeSingle();

    if (errorRelacion) throw errorRelacion;

    const esProductoPrincipal =
        conversacion.producto_id === productoIdSeleccionado;

    if (!relacion && !esProductoPrincipal) {
        throw new Error(
            "El producto seleccionado no pertenece a esta conversación."
        );
    }
}

const { error } = await supabaseClient
    .from("mensajes")
    .insert({
        conversacion_id: id,
        remitente_id: usuarioActual.id,
        contenido: contenido,
        producto_id: productoIdSeleccionado
    });

if (error) throw error;


        campo.value = "";

        await cargarConversaciones();

       const seleccionado = document.querySelector(
      `.chat-conversacion[data-conversacion-id="${id}"]`
      );

await abrirConversacionChat(id, seleccionado);
    } catch (error) {
        console.error("Error al enviar mensaje:", error);
        mostrarMensaje(
            error.message || "No se pudo enviar el mensaje.",
            "error"
        );
    } finally {
        boton.disabled = false;
    }
}

// ======================================================
// OBTENER MENSAJES OCULTOS
// ======================================================

async function obtenerMensajesOcultos() {
    if (!usuarioActual) {
        throw new Error("No hay un usuario autenticado.");
    }

    const { data, error } = await supabaseClient
        .from("mensajes_ocultos")
        .select("mensaje_id")
        .eq("usuario_id", usuarioActual.id);

    if (error) throw error;

    return new Set((data || []).map((mensaje) => mensaje.mensaje_id));
}

// ======================================================
// ELIMINAR MENSAJE PARA MÍ
// ======================================================

async function eliminarMensajeParaMi(mensajeId) {
    if (!usuarioActual || !mensajeId) return;

    try {
        const { error } = await supabaseClient
            .from("mensajes_ocultos")
            .upsert(
                {
                    mensaje_id: mensajeId,
                    usuario_id: usuarioActual.id
                },
                {
                    onConflict: "mensaje_id,usuario_id",
                    ignoreDuplicates: true
                }
            );

        if (error) throw error;

        await recargarChatActual();
    } catch (error) {
        console.error("Error al ocultar mensaje:", error);
        mostrarMensaje(
            error.message || "No se pudo ocultar el mensaje.",
            "error"
        );
    }
}

// ======================================================
// ELIMINAR MENSAJE PARA TODOS
// ======================================================

async function eliminarMensajeParaTodos(mensajeId) {
    if (!usuarioActual || !mensajeId) return;

    if (
        !confirm(
            "¿Quieres eliminar este mensaje para todos? Esta acción no se puede deshacer."
        )
    ) {
        return;
    }

    try {
        const { error } = await supabaseClient.rpc(
            "eliminar_mi_mensaje",
            { p_mensaje_id: mensajeId }
        );

        if (error) throw error;

        mostrarMensaje("Mensaje eliminado para todos.", "exito");
        await recargarChatActual();
    } catch (error) {
        console.error("Error al eliminar mensaje para todos:", error);
        mostrarMensaje(
            error.message || "No se pudo eliminar el mensaje.",
            "error"
        );
    }
}

// ======================================================
// VACIAR CONVERSACIÓN SOLO PARA EL VENDEDOR
// ======================================================

async function vaciarConversacionParaMi() {
    if (!usuarioActual || !conversacionActualId) {
        mostrarMensaje("Primero selecciona una conversación.", "error");
        return;
    }

    if (
        !confirm(
            "¿Vaciar esta conversación solo para ti? La otra persona conservará sus mensajes."
        )
    ) {
        return;
    }

    try {
        const id = conversacionActualId;

        const { data: participacion, error: errorParticipacion } =
            await supabaseClient
                .from("participantes_chat")
                .select("conversacion_id")
                .eq("conversacion_id", id)
                .eq("usuario_id", usuarioActual.id)
                .maybeSingle();

        if (errorParticipacion) throw errorParticipacion;

        if (!participacion) {
            throw new Error("No tienes acceso a esta conversación.");
        }

        const { data: mensajes, error: errorMensajes } = await supabaseClient
            .from("mensajes")
            .select("id")
            .eq("conversacion_id", id);

        if (errorMensajes) throw errorMensajes;

        if (mensajes?.length) {
            const registros = mensajes.map((mensaje) => ({
                mensaje_id: mensaje.id,
                usuario_id: usuarioActual.id
            }));

            const { error } = await supabaseClient
                .from("mensajes_ocultos")
                .upsert(registros, {
                    onConflict: "mensaje_id,usuario_id",
                    ignoreDuplicates: true
                });

            if (error) throw error;
        }

        const { error: errorOcultarConversacion } = await supabaseClient
            .from("conversaciones_ocultas")
            .upsert(
                {
                    conversacion_id: id,
                    usuario_id: usuarioActual.id
                },
                {
                    onConflict: "conversacion_id,usuario_id",
                    ignoreDuplicates: true
                }
            );

        if (errorOcultarConversacion) throw errorOcultarConversacion;

        if (conversacionActualId !== id) return;

        const listaMensajes = document.getElementById("listaMensajes");

        if (listaMensajes) {
            listaMensajes.replaceChildren();
        }

        limpiarProductoChat();

        const estado = document.getElementById("estadoChat");

        if (estado) {
            estado.textContent = "Conversación vaciada para ti.";
        }

        mostrarMensaje("Conversación vaciada para ti.", "exito");
        await cargarConversaciones();
    } catch (error) {
        console.error("Error al vaciar conversación:", error);
        mostrarMensaje(
            error.message || "No se pudo vaciar la conversación.",
            "error"
        );
    }
}

// ======================================================
// RECARGAR EL CHAT ACTUAL
// ======================================================

async function recargarChatActual() {
    if (!conversacionActualId) return;

    const id = conversacionActualId;

    const elemento = document.querySelector(
        `.chat-conversacion[data-conversacion-id="${id}"]`
    );

    await abrirConversacionChat(id, elemento);
}
