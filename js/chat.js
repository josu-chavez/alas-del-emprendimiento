/* =========================================
   ALAS DEL EMPRENDIMIENTO
   CHAT DEL COMPRADOR
========================================= */

"use strict";

const listaMensajes = document.getElementById("listaMensajes");
const estadoChat = document.getElementById("estadoChat");
const formularioChat = document.getElementById("formularioChat");
const contenidoMensaje = document.getElementById("contenidoMensaje");
const btnEnviarMensaje = document.getElementById("btnEnviarMensaje");
const btnVaciarConversacion = document.getElementById("btnVaciarConversacion");
const nombreContacto = document.getElementById("nombreContacto");
const informacionProductoChat = document.getElementById("informacionProductoChat");

const parametrosURL = new URLSearchParams(window.location.search);
const conversacionId = parametrosURL.get("id");
const productoSeleccionadoId = parametrosURL.get("producto");

let supabaseCliente = null;
let usuarioActual = null;
let canalChat = null;
let mensajesOcultos = new Set();
let conversacionLista = false;
let enviandoMensaje = false;

/* -----------------------------------------
   INICIO
----------------------------------------- */

document.addEventListener("DOMContentLoaded", iniciarChat);

async function iniciarChat() {
    if (!conversacionId) {
        mostrarError("No se indicó una conversación.");
        return;
    }

    if (
        typeof window.supabase === "undefined" ||
        typeof window.supabase.createClient !== "function"
    ) {
        mostrarError("No se pudo cargar la conexión con Supabase.");
        return;
    }

    /*
      El archivo supabase.js debe crear el cliente
      y guardarlo en una variable global llamada
      supabase o supabaseClient.
    */
    supabaseCliente =
        window.supabaseClient ||
        window.supabaseDB ||
        window.supabase;

    /*
      Si window.supabase es la biblioteca y no el cliente,
      intentamos utilizar los nombres habituales.
    */
    if (
        !supabaseCliente ||
        typeof supabaseCliente.from !== "function"
    ) {
        mostrarError(
            "No se encontró el cliente de Supabase. Revisa js/supabase.js."
        );
        return;
    }

    try {
        const { data, error } =
            await supabaseCliente.auth.getUser();

        if (error || !data || !data.user) {
            mostrarError("Inicia sesión para acceder al chat.");
            return;
        }

        usuarioActual = data.user;

        const { data: participacion, error: errorParticipacion } =
            await supabaseCliente
                .from("participantes_chat")
                .select("conversacion_id")
                .eq("conversacion_id", conversacionId)
                .eq("usuario_id", usuarioActual.id)
                .maybeSingle();

        if (errorParticipacion) {
            console.error(errorParticipacion);
            mostrarError("No se pudo verificar tu acceso a la conversación.");
            return;
        }

        if (!participacion) {
            mostrarError("No tienes acceso a esta conversación.");
            return;
        }

        
await cargarMensajesOcultos();
await cargarInformacionConversacion();

/* Verificar el producto seleccionado para este chat. */
if (productoSeleccionadoId) {
    const { data: relacion, error: errorRelacion } =
        await supabaseCliente
            .from("conversacion_productos")
            .select("producto_id")
            .eq("conversacion_id", conversacionId)
            .eq("producto_id", productoSeleccionadoId)
            .maybeSingle();

    if (errorRelacion) {
        throw errorRelacion;
    }

    if (!relacion) {
        const { data: conversacion, error: errorConversacion } =
            await supabaseCliente
                .from("conversaciones")
                .select("producto_id")
                .eq("id", conversacionId)
                .maybeSingle();

        if (errorConversacion) {
            throw errorConversacion;
        }

        if (
            !conversacion ||
            conversacion.producto_id !== productoSeleccionadoId
        ) {
            mostrarError(
                "El producto seleccionado no pertenece a esta conversación."
            );
            return;
        }
    }
}

await cargarMensajes();


        activarFormulario();
        escucharMensajesNuevos();

        conversacionLista = true;

        estadoChat.textContent = "Conversación disponible";
        btnVaciarConversacion.disabled = false;
    } catch (error) {
        console.error("Error al iniciar el chat:", error);
        mostrarError("Ocurrió un error al abrir la conversación.");
    }
}

/* -----------------------------------------
   ESTADOS Y MENSAJES DE ERROR
----------------------------------------- */

function mostrarError(mensaje) {
    estadoChat.textContent = mensaje;
    listaMensajes.replaceChildren();

    const aviso = document.createElement("p");
    aviso.className = "chat-cargando";
    aviso.textContent = mensaje;

    listaMensajes.appendChild(aviso);

    contenidoMensaje.disabled = true;
    btnEnviarMensaje.disabled = true;
    btnVaciarConversacion.disabled = true;
}

function activarFormulario() {
    contenidoMensaje.disabled = false;
    btnEnviarMensaje.disabled = false;
    btnVaciarConversacion.disabled = false;
}

/* -----------------------------------------
   MENSAJES OCULTOS PARA EL USUARIO
----------------------------------------- */

async function cargarMensajesOcultos() {
    const { data, error } = await supabaseCliente
        .from("mensajes_ocultos")
        .select("mensaje_id")
        .eq("usuario_id", usuarioActual.id);

    if (error) {
        console.error("Error al cargar mensajes ocultos:", error);
        throw error;
    }

    mensajesOcultos = new Set(
        (data || []).map((fila) => fila.mensaje_id)
    );
}

/* -----------------------------------------
   INFORMACIÓN DEL CONTACTO Y PRODUCTOS
----------------------------------------- */

async function cargarInformacionConversacion() {
    nombreContacto.textContent = "💬 Conversación";

    informacionProductoChat.replaceChildren();
    informacionProductoChat.hidden = true;

    const { data: conversacion, error: errorConversacion } =
        await supabaseCliente
            .from("conversaciones")
            .select("id, producto_id")
            .eq("id", conversacionId)
            .maybeSingle();

    if (errorConversacion) {
        console.error("Error al cargar la conversación:", errorConversacion);
    }

    if (!conversacion) {
        throw new Error("No se encontró la conversación.");
    }

    /* Obtener el nombre del otro participante. */

    const { data: contacto, error: errorContacto } =
        await supabaseCliente.rpc("obtener_otro_participante", {
            p_conversacion_id: conversacionId
        });

    if (errorContacto) {
        console.warn("No se pudo obtener el contacto:", errorContacto);
    } else {
        const persona = Array.isArray(contacto)
            ? contacto[0]
            : contacto;

        if (persona) {
            const nombre =
                persona.nombre ||
                persona.nombre_completo ||
                persona.correo ||
                persona.email;

            if (nombre) {
                nombreContacto.textContent = "💬 " + nombre;
            }
        }
    }

    /*
      Obtener los productos vinculados a la conversación.
      Se conserva el producto principal y los productos adicionales.
    */

    const idsProductos = new Set();

    if (conversacion.producto_id) {
        idsProductos.add(conversacion.producto_id);
    }

    const { data: relaciones, error: errorRelaciones } =
        await supabaseCliente
            .from("conversacion_productos")
            .select("producto_id")
            .eq("conversacion_id", conversacionId);

    if (errorRelaciones) {
        console.warn("No se pudieron cargar los productos relacionados:", errorRelaciones);
    } else {
        (relaciones || []).forEach((relacion) => {
            if (relacion.producto_id) {
                idsProductos.add(relacion.producto_id);
            }
        });
    }

    if (idsProductos.size === 0) {
        return;
    }

    const { data: productos, error: errorProductos } =
        await supabaseCliente
            .from("productos")
            .select("id, nombre, precio, imagen")
            .in("id", Array.from(idsProductos));

    if (errorProductos) {
        console.error("Error al cargar productos:", errorProductos);
        return;
    }

    if (!productos || productos.length === 0) {
        return;
    }

    productos.forEach((producto) => {
        const tarjeta = crearTarjetaProducto(producto);
        informacionProductoChat.appendChild(tarjeta);
    });

    informacionProductoChat.hidden =
        informacionProductoChat.children.length === 0;
}


function crearTarjetaProducto(producto) {
    const tarjeta = document.createElement("article");
    tarjeta.className = "producto-chat";
    tarjeta.dataset.productoId = producto.id;

    const imagen = document.createElement("img");
    imagen.alt = producto.nombre
        ? "Imagen de " + producto.nombre
        : "Imagen del producto";
    imagen.loading = "lazy";

    if (producto.imagen) {
        imagen.src = producto.imagen;
    } else {
        imagen.hidden = true;
    }

    const datos = document.createElement("div");
    datos.className = "producto-chat-datos";

    const nombre = document.createElement("strong");
    nombre.textContent = producto.nombre || "Producto";

    const precio = document.createElement("span");
    const valorPrecio = Number(producto.precio);

    precio.textContent = Number.isFinite(valorPrecio)
        ? "Bs " + valorPrecio.toFixed(2)
        : "Precio no disponible";

    const enlace = document.createElement("a");
    enlace.href =
        "detalle-producto.html?id=" +
        encodeURIComponent(producto.id);
    enlace.textContent = "Ver producto";

    const botonQuitar = document.createElement("button");
    botonQuitar.type = "button";
    botonQuitar.className = "btn-quitar-producto-chat";
    botonQuitar.textContent = "Quitar del chat";
    botonQuitar.addEventListener("click", () => {
        quitarProductoDeConversacion(producto.id, botonQuitar);
    });

    datos.append(nombre, precio, enlace, botonQuitar);

    if (!imagen.hidden) {
        tarjeta.appendChild(imagen);
    }

    tarjeta.appendChild(datos);

    return tarjeta;
}

/* -----------------------------------------
   QUITAR PRODUCTO DE LA CONVERSACIÓN
----------------------------------------- */

async function quitarProductoDeConversacion(productoId, boton) {
    if (!conversacionLista || !productoId) {
        return;
    }

    const confirmar = confirm(
        "¿Quieres quitar este producto de la conversación para ambos participantes? El producto seguirá publicado en la tienda."
    );

    if (!confirmar) {
        return;
    }

    boton.disabled = true;
    boton.textContent = "Quitando...";

    try {
        const { error } = await supabaseCliente.rpc(
            "quitar_producto_conversacion",
            {
                p_conversacion_id: conversacionId,
                p_producto_id: productoId
            }
        );

        if (error) {
            console.error("Error al quitar el producto:", error);
            alert(
                "No se pudo quitar el producto. Comprueba tu conexión e inténtalo nuevamente."
            );
            boton.disabled = false;
            boton.textContent = "Quitar del chat";
            return;
        }

        await cargarInformacionConversacion();

        estadoChat.textContent = "Producto quitado de la conversación";
    } catch (error) {
        console.error("Error al quitar el producto:", error);
        alert("Ocurrió un error al quitar el producto del chat.");

        boton.disabled = false;
        boton.textContent = "Quitar del chat";
    }
}


/* -----------------------------------------
   CARGAR MENSAJES
----------------------------------------- */

async function cargarMensajes() {
    listaMensajes.replaceChildren();

    const { data: mensajes, error } = await supabaseCliente
    .from("mensajes")
    .select("id, remitente_id, contenido, creado_en, producto_id")
    .eq("conversacion_id", conversacionId)
    .order("creado_en", { ascending: true });

    if (error) {
        console.error("Error al cargar mensajes:", error);
        mostrarAvisoEnMensajes("No se pudieron cargar los mensajes.");
        return;
    }

    const mensajesVisibles = (mensajes || []).filter(
        (mensaje) => !mensajesOcultos.has(mensaje.id)
    );

    if (mensajesVisibles.length === 0) {
        mostrarAvisoEnMensajes(
            "Todavía no hay mensajes visibles. ¡Puedes iniciar la conversación!"
        );
        return;
    }

    mensajesVisibles.forEach(mostrarMensaje);
    desplazarAlFinal();
}

function mostrarAvisoEnMensajes(texto) {
    const aviso = document.createElement("p");
    aviso.className = "chat-cargando";
    aviso.textContent = texto;
    listaMensajes.appendChild(aviso);
}

/* -----------------------------------------
   MOSTRAR UN MENSAJE
----------------------------------------- */

function mostrarMensaje(mensaje) {
    if (!mensaje || mensajesOcultos.has(mensaje.id)) {
        return;
    }

    /*
      Evita mostrar dos veces el mismo mensaje
      cuando Supabase Realtime lo recibe.
    */

    if (
        listaMensajes.querySelector(
            '[data-mensaje-id="' + mensaje.id + '"]'
        )
    ) {
        return;
    }

    const aviso = listaMensajes.querySelector(".chat-cargando");
    if (aviso) {
        aviso.remove();
    }

    const burbuja = document.createElement("div");

    burbuja.className =
        "chat-mensaje " +
        (
            mensaje.remitente_id === usuarioActual.id
                ? "chat-propio"
                : "chat-otro"
        );

    burbuja.dataset.mensajeId = mensaje.id;

    const texto = document.createElement("div");
    texto.textContent = mensaje.contenido || "";

    const hora = document.createElement("span");
    hora.className = "chat-hora";

    const fecha = new Date(mensaje.creado_en);

    hora.textContent = Number.isNaN(fecha.getTime())
        ? ""
        : fecha.toLocaleString("es-BO", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
        });

    burbuja.append(texto, hora);
    listaMensajes.appendChild(burbuja);

    desplazarAlFinal();
}

function desplazarAlFinal() {
    listaMensajes.scrollTop = listaMensajes.scrollHeight;
}

/* -----------------------------------------
   ENVIAR MENSAJES
----------------------------------------- */

formularioChat.addEventListener("submit", enviarMensaje);

async function enviarMensaje(evento) {
    evento.preventDefault();

    if (!conversacionLista || enviandoMensaje) {
        return;
    }

    const contenido = contenidoMensaje.value.trim();

    if (!contenido) {
        contenidoMensaje.focus();
        return;
    }

    if (contenido.length > 3000) {
        alert("El mensaje no puede superar los 3000 caracteres.");
        return;
    }

    enviandoMensaje = true;
    btnEnviarMensaje.disabled = true;

    try {
        
const { data: mensaje, error } = await supabaseCliente
    .from("mensajes")
    .insert({
        conversacion_id: conversacionId,
        remitente_id: usuarioActual.id,
        contenido: contenido,
        producto_id: productoSeleccionadoId || null
    })
    .select("id, remitente_id, contenido, creado_en, producto_id")
    .single();


        if (error) {
            console.error("Error al enviar mensaje:", error);
            alert("No se pudo enviar el mensaje. Inténtalo nuevamente.");
            return;
        }

        contenidoMensaje.value = "";
        mostrarMensaje(mensaje);
        contenidoMensaje.focus();
    } catch (error) {
        console.error(error);
        alert("Ocurrió un error al enviar el mensaje.");
    } finally {
        enviandoMensaje = false;
        btnEnviarMensaje.disabled = false;
    }
}

/* -----------------------------------------
   VACIAR CONVERSACIÓN PARA MÍ
----------------------------------------- */

btnVaciarConversacion.addEventListener(
    "click",
    vaciarConversacion
);

async function vaciarConversacion() {
    if (!conversacionLista) {
        return;
    }

    const confirmar = confirm(
        "¿Quieres ocultar todos los mensajes de esta conversación solo para ti? No se borrarán para la otra persona."
    );

    if (!confirmar) {
        return;
    }

    btnVaciarConversacion.disabled = true;

    try {
        const { data: mensajes, error: errorMensajes } =
            await supabaseCliente
                .from("mensajes")
                .select("id")
                .eq("conversacion_id", conversacionId);

        if (errorMensajes) {
            throw errorMensajes;
        }

        const filas = (mensajes || [])
            .filter((mensaje) => !mensajesOcultos.has(mensaje.id))
            .map((mensaje) => ({
                mensaje_id: mensaje.id,
                usuario_id: usuarioActual.id
            }));

        if (filas.length > 0) {
            const { error: errorOcultar } = await supabaseCliente
                .from("mensajes_ocultos")
                .upsert(filas, {
                    onConflict: "mensaje_id,usuario_id",
                    ignoreDuplicates: true
                });

            if (errorOcultar) {
                throw errorOcultar;
            }

            filas.forEach((fila) => {
                mensajesOcultos.add(fila.mensaje_id);
            });
        }

        listaMensajes.replaceChildren();
        mostrarAvisoEnMensajes(
            "Conversación vaciada para ti. Los mensajes de la otra persona no se han borrado."
        );
    } catch (error) {
        console.error("Error al vaciar conversación:", error);
        alert("No se pudo vaciar la conversación. Revisa tu conexión e inténtalo otra vez.");
    } finally {
        btnVaciarConversacion.disabled = false;
    }
}

/* -----------------------------------------
   MENSAJES EN TIEMPO REAL
----------------------------------------- */

function escucharMensajesNuevos() {
    if (canalChat) {
        supabaseCliente.removeChannel(canalChat);
    }

    canalChat = supabaseCliente
        .channel("chat-" + conversacionId)
        .on(
            "postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: "mensajes",
                filter: "conversacion_id=eq." + conversacionId
            },
            (payload) => {
                const mensaje = payload.new;

                if (!mensaje || mensajesOcultos.has(mensaje.id)) {
                    return;
                }

                mostrarMensaje(mensaje);
            }
        )
        
        .on(
            "postgres_changes",
            {
                event: "DELETE",
                schema: "public",
                table: "conversacion_productos",
                filter: "conversacion_id=eq." + conversacionId
            },
            () => {
                cargarInformacionConversacion().catch(console.error);
            }
        )
        .on(
            "postgres_changes",
            {
                event: "UPDATE",
                schema: "public",
                table: "conversaciones",
                filter: "id=eq." + conversacionId
            },
            () => {
                cargarInformacionConversacion().catch(console.error);
            }
        )

        .subscribe((estado) => {
            if (estado === "SUBSCRIBED") {
                estadoChat.textContent = "Conectado";
            } else if (estado === "CHANNEL_ERROR" || estado === "TIMED_OUT") {
                estadoChat.textContent =
                    "Conexión inestable. Intenta recargar la página.";
            }
        });
}

/* -----------------------------------------
   LIMPIAR CONEXIÓN
----------------------------------------- */

window.addEventListener("beforeunload", () => {
    if (canalChat && supabaseCliente) {
        supabaseCliente.removeChannel(canalChat);
    }
});